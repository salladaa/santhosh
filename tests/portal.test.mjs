import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

// Uses a fresh database and its own production server; never touches workspace records.
test(
  "portal integration: authorization, validation, CRUD, sessions and persistence",
  { timeout: 90000 },
  async (t) => {
    const dir = await mkdtemp(join(tmpdir(), "carewell-test-"));
    const dbPath = join(dir, "test.sqlite");
    const port = 3107;
    const base = `http://127.0.0.1:${port}`;
    let child;
    let output = "";
    async function start(overrides = {}) {
      child = spawn(process.execPath, [".next/standalone/server.js"], {
        env: {
          ...process.env,
          HOSTNAME: "127.0.0.1",
          PORT: String(port),
          PORTAL_DEMO: "true",
          PORTAL_DB_PATH: dbPath,
          PORTAL_ORIGIN: "",
          PORTAL_ADMIN_EMAIL: "admin@hospital.com",
          PORTAL_ADMIN_PASSWORD: "admin123",
          ...overrides,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
      child.stderr.on("data", (chunk) => {
        output += chunk;
      });
      for (let i = 0; i < 100; i++) {
        if (child.exitCode !== null)
          throw new Error(`Test server failed: ${output}`);
        try {
          const response = await fetch(`${base}/login`);
          if (response.status === 200) return;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(`Test server did not start: ${output}`);
    }
    async function stop() {
      if (!child || child.exitCode !== null) return;
      const ended = new Promise((resolve) => child.once("exit", resolve));
      child.kill("SIGTERM");
      await ended;
    }
    async function call(
      path,
      { method = "GET", data, cookie, origin = base } = {},
    ) {
      const response = await fetch(base + path, {
        method,
        redirect: "manual",
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(method !== "GET"
            ? { "Content-Type": "application/json", Origin: origin }
            : {}),
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {}
      return { status: response.status, headers: response.headers, json, text };
    }
    async function login(email, password) {
      const result = await call("/api/auth/login", {
        method: "POST",
        data: { email, password },
      });
      assert.equal(result.status, 200, result.text);
      const header = result.headers.get("set-cookie");
      assert.match(header, /HttpOnly/i);
      assert.match(header, /SameSite=lax/i);
      assert.match(header, /Secure/i);
      return header.split(";")[0];
    }
    try {
      await start();
      let admin;
      let patientSession;
      let created;
      const input = {
        name: "Integration Patient",
        age: 0,
        phone: "+1 (807) 555-0199",
        email: "integration@example.test",
        password: "temporary-test-password",
        medicines: ["Medicine A"],
        reports: ["Test report"],
        billAmount: 123.45,
        billStatus: "Pending",
        treatment: "Sample care notes",
        nextCheckup: "2027-02-28",
        appointmentStatus: "Scheduled",
      };
      await t.test(
        "anonymous access is rejected on every patient route",
        async () => {
          for (const route of ["/api/patients", "/api/patients/1"])
            assert.equal((await call(route)).status, 401);
          for (const route of [
            "/admin",
            "/admin/patients",
            "/admin/patients/1",
            "/admin/patients/1/edit",
            "/admin/patients/new",
            "/admin/billing",
            "/admin/activity",
            "/patient",
          ]) {
            const response = await call(route);
            assert.equal(response.status, 307);
            assert.equal(response.headers.get("location"), "/login");
          }
          for (const method of ["POST", "PUT", "DELETE"])
            assert.equal(
              (
                await call(
                  method === "POST" ? "/api/patients" : "/api/patients/1",
                  { method, data: input },
                )
              ).status,
              401,
            );
        },
      );
      await t.test(
        "login normalizes emails and seeds persistent demo records",
        async () => {
          assert.equal(
            (
              await call("/api/auth/login", {
                method: "POST",
                data: { email: "admin@hospital.com", password: "wrong" },
              })
            ).status,
            401,
          );
          admin = await login(" ADMIN@HOSPITAL.COM ", "admin123");
          const result = await call("/api/patients", { cookie: admin });
          assert.equal(result.json.patients.length, 3);
          assert.equal(
            result.json.patients.find((p) => p.id === "1").nextCheckup,
            "2026-04-30",
          );
          assert.ok(result.json.patients.every((p) => !("password" in p)));
          assert.equal(result.headers.get("cache-control"), "no-store");
          for (const path of [
            "/admin",
            "/admin/patients",
            "/admin/patients/new",
            "/admin/patients/1",
            "/admin/patients/1/edit",
            "/admin/appointments",
            "/admin/billing",
            "/admin/activity",
          ])
            assert.equal(
              (await call(path, { cookie: admin })).status,
              200,
              path,
            );
        },
      );
      await t.test("patients can only read their own record", async () => {
        const john = await login("john@hospital.com", "john123");
        assert.equal(
          (await call("/api/patients/1", { cookie: john })).status,
          200,
        );
        assert.equal(
          (await call("/api/patients/2", { cookie: john })).status,
          403,
        );
        assert.equal(
          (await call("/api/patients", { cookie: john })).status,
          403,
        );
        assert.equal(
          (
            await call("/api/patients", {
              method: "POST",
              cookie: john,
              data: input,
            })
          ).status,
          403,
        );
        for (const method of ["PUT", "DELETE"])
          assert.equal(
            (
              await call("/api/patients/1", {
                method,
                cookie: john,
                data: input,
              })
            ).status,
            403,
          );
        assert.equal(
          (await call("/admin/patients/1/edit", { cookie: john })).headers.get(
            "location",
          ),
          "/patient",
        );
        const page = await call("/patient", { cookie: john });
        assert.equal(page.status, 200);
        assert.ok(!page.text.includes("Sarah Lee"));
      });
      await t.test(
        "server rejects cross-origin requests and invalid input",
        async () => {
          assert.equal(
            (
              await call("/api/patients", {
                method: "POST",
                cookie: admin,
                data: input,
                origin: "https://untrusted.example",
              })
            ).status,
            403,
          );
          for (const fields of [
            { age: -1 },
            { age: 2.5 },
            { billAmount: -1 },
            { billAmount: 1.111 },
            { nextCheckup: "2027-02-30" },
            { password: "short" },
            { email: "bad" },
            { phone: "123" },
            { appointmentStatus: "Invented" },
            { medicines: "not an array" },
          ]) {
            assert.equal(
              (
                await call("/api/patients", {
                  method: "POST",
                  cookie: admin,
                  data: { ...input, ...fields },
                })
              ).status,
              400,
              JSON.stringify(fields),
            );
          }
          assert.equal(
            (
              await call("/api/patients", {
                method: "POST",
                cookie: admin,
                data: { ...input, email: "admin@hospital.com" },
              })
            ).status,
            409,
          );
        },
      );
      await t.test("create, login and hashed password storage", async () => {
        const result = await call("/api/patients", {
          method: "POST",
          cookie: admin,
          data: input,
        });
        assert.equal(result.status, 201, result.text);
        created = result.json.patient;
        assert.equal(created.version, 1);
        assert.ok(!("password" in created));
        assert.equal(
          (
            await call("/api/patients", {
              method: "POST",
              cookie: admin,
              data: { ...input, email: input.email.toUpperCase() },
            })
          ).status,
          409,
        );
        patientSession = await login(input.email, input.password);
        const store = new DatabaseSync(dbPath);
        const user = store
          .prepare("SELECT password_hash FROM users WHERE email=?")
          .get(input.email);
        assert.notEqual(user.password_hash, input.password);
        assert.match(user.password_hash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
        store.close();
      });
      await t.test(
        "edit increments version, detects conflicts, and revokes sessions after password reset",
        async () => {
          const update = {
            ...created,
            treatment: "Updated care notes",
            billStatus: "Paid",
            password: "another-test-password",
          };
          const result = await call(`/api/patients/${created.id}`, {
            method: "PUT",
            cookie: admin,
            data: update,
          });
          assert.equal(result.status, 200, result.text);
          assert.equal(result.json.patient.version, 2);
          assert.equal(
            (
              await call(`/api/patients/${created.id}`, {
                method: "PUT",
                cookie: admin,
                data: update,
              })
            ).status,
            409,
          );
          assert.equal(
            (
              await call(`/api/patients/${created.id}`, {
                cookie: patientSession,
              })
            ).status,
            401,
          );
          patientSession = await login(input.email, "another-test-password");
          const own = await call(`/api/patients/${created.id}`, {
            cookie: patientSession,
          });
          assert.equal(own.json.patient.treatment, "Updated care notes");
          const audit = await call("/admin/activity", { cookie: admin });
          assert.match(audit.text, /Updated patient record/);
        },
      );
      await t.test("records and sessions survive server restart", async () => {
        await stop();
        await start();
        const result = await call(`/api/patients/${created.id}`, {
          cookie: admin,
        });
        assert.equal(result.status, 200);
        assert.equal(result.json.patient.billStatus, "Paid");
      });
      await t.test(
        "delete revokes patient access, logout revokes admin access",
        async () => {
          assert.equal(
            (
              await call(`/api/patients/${created.id}`, {
                method: "DELETE",
                cookie: admin,
                data: { version: 1 },
              })
            ).status,
            409,
          );
          assert.equal(
            (
              await call(`/api/patients/${created.id}`, {
                method: "DELETE",
                cookie: admin,
                data: { version: 2 },
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await call(`/api/patients/${created.id}`, {
                cookie: patientSession,
              })
            ).status,
            401,
          );
          assert.equal(
            (await call(`/api/patients/${created.id}`, { cookie: admin }))
              .status,
            404,
          );
          assert.equal(
            (
              await call("/api/auth/logout", {
                method: "POST",
                cookie: admin,
                data: {},
              })
            ).status,
            200,
          );
          assert.equal(
            (await call("/api/patients", { cookie: admin })).status,
            401,
          );
        },
      );
      await t.test("repeated failed logins are throttled", async () => {
        for (let i = 0; i < 8; i++)
          assert.equal(
            (
              await call("/api/auth/login", {
                method: "POST",
                data: { email: "nobody@example.test", password: "incorrect" },
              })
            ).status,
            401,
          );
        assert.equal(
          (
            await call("/api/auth/login", {
              method: "POST",
              data: { email: "nobody@example.test", password: "incorrect" },
            })
          ).status,
          429,
        );
      });
      await t.test(
        "hospital workflows, roles and durable clinical data",
        async (h) => {
          const manager = await login("admin@hospital.com", "admin123"),
            john = await login("john@hospital.com", "john123"),
            sarah = await login("sarah@hospital.com", "sarah123");
          let doctorId,
            doctor,
            nurse,
            appointmentId,
            reportId,
            invoiceId,
            admissionId;
          await h.test("staff accounts and role boundaries", async () => {
            const d = await call("/api/staff", {
              method: "POST",
              cookie: manager,
              data: {
                name: "Test Doctor",
                email: "doctor@example.test",
                password: "doctor-test-password",
                role: "doctor",
                registration: "TEST-D001",
              },
            });
            assert.equal(d.status, 201, d.text);
            doctorId = d.json.id;
            const n = await call("/api/staff", {
              method: "POST",
              cookie: manager,
              data: {
                name: "Test Nurse",
                email: "nurse@example.test",
                password: "nurse-test-password",
                role: "nurse",
                registration: "TEST-N001",
              },
            });
            assert.equal(n.status, 201, n.text);
            doctor = await login("doctor@example.test", "doctor-test-password");
            nurse = await login("nurse@example.test", "nurse-test-password");
            for (const cookie of [doctor, nurse, john])
              assert.equal((await call("/api/staff", { cookie })).status, 403);
            assert.equal(
              (await call("/api/patients", { cookie: doctor })).status,
              200,
            );
            assert.equal(
              (await call("/api/system", { cookie: john })).status,
              403,
            );
            for (const path of [
              "/admin/system",
              "/admin/staff",
              "/admin/inpatient",
              "/account",
            ])
              assert.equal(
                (await call(path, { cookie: manager })).status,
                200,
                path,
              );
          });
          await h.test(
            "appointment ownership, overlap protection and edit conflicts",
            async () => {
              const request = {
                patientId: "2",
                doctorId,
                localTime: "2099-06-15T10:00",
                duration: 30,
                reason: "Follow-up request",
              };
              const a = await call("/api/appointments", {
                method: "POST",
                cookie: john,
                data: request,
              });
              assert.equal(a.status, 201, a.text);
              appointmentId = a.json.id;
              const rows = (await call("/api/appointments", { cookie: john }))
                .json.appointments;
              assert.equal(rows[0].patientId, "1");
              assert.equal(rows[0].status, "Requested");
              assert.equal(
                (
                  await call("/api/appointments", {
                    method: "POST",
                    cookie: manager,
                    data: request,
                  })
                ).status,
                201,
              );
              assert.equal(
                (
                  await call(`/api/appointments/${appointmentId}`, {
                    method: "PUT",
                    cookie: manager,
                    data: { version: 1, status: "Scheduled" },
                  })
                ).status,
                409,
              );
              assert.equal(
                (
                  await call(`/api/appointments/${appointmentId}`, {
                    method: "PUT",
                    cookie: sarah,
                    data: { version: 1, status: "Cancelled" },
                  })
                ).status,
                403,
              );
              assert.equal(
                (
                  await call(`/api/appointments/${appointmentId}`, {
                    method: "PUT",
                    cookie: manager,
                    data: {
                      version: 1,
                      status: "Scheduled",
                      localTime: "2099-06-15T11:00",
                      duration: 30,
                    },
                  })
                ).status,
                200,
              );
              assert.equal(
                (
                  await call(`/api/appointments/${appointmentId}`, {
                    method: "PUT",
                    cookie: manager,
                    data: { version: 1, status: "Cancelled" },
                  })
                ).status,
                409,
              );
              assert.equal(
                (
                  await call("/api/appointments", {
                    method: "POST",
                    cookie: manager,
                    data: { ...request, localTime: "2099-06-15T11:15" },
                  })
                ).status,
                409,
              );
              assert.equal(
                (
                  await call("/api/appointments", {
                    method: "POST",
                    cookie: john,
                    data: { ...request, localTime: "2099-02-30T11:15" },
                  })
                ).status,
                400,
              );
            },
          );
          await h.test(
            "only clinical staff can record prescriptions, patients only see their own",
            async () => {
              const data = {
                complaint: "Test complaint",
                diagnosis: "Test diagnosis",
                vitals: "Test observations",
                notes: "Sample notes",
                followUp: "As instructed",
                medicines: [
                  {
                    name: "Test medicine",
                    dose: "Test dose",
                    frequency: "As recorded",
                    duration: "Test duration",
                    instructions: "Test only",
                  },
                ],
              };
              for (const cookie of [john, nurse])
                assert.equal(
                  (
                    await call("/api/patients/1/visits", {
                      method: "POST",
                      cookie,
                      data,
                    })
                  ).status,
                  403,
                );
              const v = await call("/api/patients/1/visits", {
                method: "POST",
                cookie: doctor,
                data,
              });
              assert.equal(v.status, 201, v.text);
              const care = (
                await call("/api/patients/1/care", { cookie: john })
              ).json;
              assert.equal(care.visits[0].doctorName, "Test Doctor");
              assert.equal(care.visits[0].medicines[0].name, "Test medicine");
              assert.equal(
                (await call("/api/patients/1/care", { cookie: sarah })).status,
                403,
              );
            },
          );
          await h.test(
            "report files are encrypted and access-controlled",
            async () => {
              const bytes = Buffer.from("%PDF-1.4\nTest report\n%%EOF");
              const upload = (cookie, content) =>
                fetch(`${base}/api/patients/1/reports?title=Test%20report`, {
                  method: "POST",
                  headers: {
                    Cookie: cookie,
                    Origin: base,
                    "Content-Type": "application/pdf",
                  },
                  body: content,
                });
              assert.equal((await upload(john, bytes)).status, 403);
              assert.equal(
                (await upload(doctor, Buffer.from("invalid"))).status,
                415,
              );
              const uploaded = await upload(doctor, bytes);
              assert.equal(uploaded.status, 201);
              reportId = (await uploaded.json()).id;
              const download = await fetch(`${base}/api/reports/${reportId}`, {
                headers: { Cookie: john },
              });
              assert.equal(download.status, 200);
              assert.match(
                download.headers.get("content-disposition"),
                /^attachment/,
              );
              assert.deepEqual(
                Buffer.from(await download.arrayBuffer()),
                bytes,
              );
              assert.equal(
                (await call(`/api/reports/${reportId}`, { cookie: sarah }))
                  .status,
                403,
              );
              assert.equal(
                (await call(`/api/reports/${reportId}`)).status,
                401,
              );
              const store = new DatabaseSync(dbPath);
              assert.notDeepEqual(
                Buffer.from(
                  store
                    .prepare("SELECT content FROM reports WHERE id=?")
                    .get(reportId).content,
                ),
                bytes,
              );
              store.close();
            },
          );
          await h.test(
            "invoices reject duplicate receipts and overpayment",
            async () => {
              const data = {
                patientId: "1",
                items: [
                  { description: "Consultation", amount: 500 },
                  { description: "Report", amount: 200 },
                ],
              };
              assert.equal(
                (
                  await call("/api/invoices", {
                    method: "POST",
                    cookie: doctor,
                    data,
                  })
                ).status,
                403,
              );
              const i = await call("/api/invoices", {
                method: "POST",
                cookie: manager,
                data,
              });
              assert.equal(i.status, 201);
              invoiceId = i.json.id;
              const payment = {
                amount: 300,
                method: "UPI",
                reference: "test-upi-1",
              };
              assert.equal(
                (
                  await call(`/api/invoices/${invoiceId}/payments`, {
                    method: "POST",
                    cookie: manager,
                    data: payment,
                  })
                ).status,
                201,
              );
              assert.equal(
                (
                  await call(`/api/invoices/${invoiceId}/payments`, {
                    method: "POST",
                    cookie: manager,
                    data: payment,
                  })
                ).status,
                409,
              );
              assert.equal(
                (
                  await call(`/api/invoices/${invoiceId}/payments`, {
                    method: "POST",
                    cookie: manager,
                    data: { amount: 401, method: "Cash", reference: "cash-1" },
                  })
                ).status,
                409,
              );
              const own = (await call("/api/invoices", { cookie: john })).json
                .invoices;
              assert.equal(own[0].totalPaise, 70000);
              assert.equal(own[0].paidPaise, 30000);
              assert.equal(
                (await call("/api/invoices", { cookie: sarah })).json.invoices
                  .length,
                0,
              );
            },
          );
          await h.test(
            "bed occupancy, nursing notes and discharge permissions",
            async () => {
              const b = await call("/api/beds", {
                method: "POST",
                cookie: manager,
                data: { ward: "Test ward", label: "01" },
              });
              assert.equal(b.status, 201);
              const data = {
                patientId: "1",
                doctorId,
                bedId: b.json.id,
                reason: "Observation",
              };
              const a = await call("/api/admissions", {
                method: "POST",
                cookie: manager,
                data,
              });
              assert.equal(a.status, 201);
              admissionId = a.json.id;
              assert.equal(
                (
                  await call("/api/admissions", {
                    method: "POST",
                    cookie: manager,
                    data: { ...data, patientId: "2" },
                  })
                ).status,
                409,
              );
              assert.equal(
                (
                  await call(`/api/admissions/${admissionId}/notes`, {
                    method: "POST",
                    cookie: nurse,
                    data: { observations: "Sample observations" },
                  })
                ).status,
                201,
              );
              assert.equal(
                (
                  await call(`/api/admissions/${admissionId}/notes`, {
                    method: "POST",
                    cookie: john,
                    data: { observations: "Not allowed" },
                  })
                ).status,
                403,
              );
              assert.equal(
                (
                  await call(`/api/admissions/${admissionId}/discharge`, {
                    method: "POST",
                    cookie: nurse,
                    data: { summary: "Not allowed", version: 1 },
                  })
                ).status,
                403,
              );
              assert.equal(
                (await call("/api/admissions", { cookie: john })).json
                  .admissions[0].notes[0].author,
                "Test Nurse",
              );
              assert.equal(
                (await call("/api/admissions", { cookie: sarah })).json
                  .admissions.length,
                0,
              );
              assert.equal(
                (
                  await call(`/api/admissions/${admissionId}/discharge`, {
                    method: "POST",
                    cookie: doctor,
                    data: {
                      summary: "Recorded discharge and follow-up",
                      version: 1,
                    },
                  })
                ).status,
                200,
              );
              assert.equal(
                (await call("/api/beds", { cookie: manager })).json.beds[0]
                  .occupied,
                0,
              );
              assert.equal(
                (
                  await call(`/api/admissions/${admissionId}/notes`, {
                    method: "POST",
                    cookie: nurse,
                    data: { observations: "Closed admission" },
                  })
                ).status,
                409,
              );
              assert.equal(
                (
                  await call("/api/patients/1", {
                    method: "DELETE",
                    cookie: manager,
                    data: { version: 1 },
                  })
                ).status,
                409,
              );
            },
          );
          await h.test(
            "password changes and staff disabling revoke sessions",
            async () => {
              const second = await login(
                "doctor@example.test",
                "doctor-test-password",
              );
              assert.equal(
                (
                  await call("/api/account/password", {
                    method: "POST",
                    cookie: doctor,
                    data: {
                      currentPassword: "wrong",
                      newPassword: "replacement-test-password",
                    },
                  })
                ).status,
                400,
              );
              assert.equal(
                (
                  await call("/api/account/password", {
                    method: "POST",
                    cookie: doctor,
                    data: {
                      currentPassword: "doctor-test-password",
                      newPassword: "replacement-test-password",
                    },
                  })
                ).status,
                200,
              );
              assert.equal(
                (await call("/api/patients", { cookie: second })).status,
                401,
              );
              doctor = await login(
                "doctor@example.test",
                "replacement-test-password",
              );
              assert.equal(
                (
                  await call(`/api/staff/${doctorId}`, {
                    method: "PUT",
                    cookie: manager,
                    data: { active: false },
                  })
                ).status,
                200,
              );
              assert.equal(
                (await call("/api/patients", { cookie: doctor })).status,
                401,
              );
            },
          );
          await h.test(
            "database status, audit and encrypted backup restore",
            async () => {
              const status = (await call("/api/system", { cookie: manager }))
                .json;
              assert.equal(status.healthy, true);
              assert.equal(status.schemaVersion, "3");
              assert.equal(status.counts.reports, 1);
              assert.equal(status.counts.admissions, 1);
              const events = (
                await call("/api/system/audit", { cookie: manager })
              ).json.events;
              assert.ok(events.some((e) => e.action === "Downloaded report"));
              assert.ok(events.some((e) => e.action === "Discharged patient"));
              const backups = join(dir, "backups"),
                key = "ab".repeat(32),
                env = {
                  ...process.env,
                  PORTAL_DB_PATH: dbPath,
                  PORTAL_BACKUP_DIR: backups,
                  PORTAL_BACKUP_KEY: key,
                };
              execFileSync(process.execPath, ["scripts/backup.mjs"], {
                env,
                stdio: "pipe",
              });
              const file = join(backups, (await readdir(backups))[0]);
              assert.equal(
                (await readFile(file)).subarray(0, 4).toString(),
                "SAH1",
              );
              const restored = join(dir, "restored.sqlite");
              execFileSync(
                process.execPath,
                ["scripts/restore.mjs", file, restored],
                { env, stdio: "pipe" },
              );
              const copy = new DatabaseSync(restored);
              assert.equal(
                copy.prepare("SELECT COUNT(*) AS n FROM reports").get().n,
                1,
              );
              assert.equal(
                copy.prepare("PRAGMA integrity_check").get().integrity_check,
                "ok",
              );
              copy.close();
              assert.throws(() =>
                execFileSync(
                  process.execPath,
                  ["scripts/restore.mjs", file, join(dir, "wrong-key.sqlite")],
                  {
                    env: { ...env, PORTAL_BACKUP_KEY: "cd".repeat(32) },
                    stdio: "pipe",
                  },
                ),
              );
            },
          );
          await h.test(
            "populated workspaces render without streamed server errors",
            async () => {
              for (const [path, cookie, expected] of [
                ["/admin/staff", manager, "Create staff account"],
                ["/admin/appointments", manager, "Follow-up request"],
                ["/admin/inpatient", manager, "Discharged"],
                ["/admin/patients/1", manager, "John Doe"],
                ["/patient", john, "John Doe"],
              ]) {
                const response = await call(path, { cookie });
                assert.equal(response.status, 200, path);
                // Streaming responses can return 200 even when a component crashes.
                assert.doesNotMatch(
                  response.text,
                  /\\n[0-9a-f]+:E\{|Only plain objects|We couldn’t load this page/,
                  path,
                );
                assert.ok(
                  response.text.includes(expected),
                  `${path}: expected rendered content`,
                );
              }
            },
          );
          await h.test(
            "clinical records persist after restarting the server",
            async () => {
              await stop();
              await start();
              const result = await call("/api/patients/1/care", {
                cookie: john,
              });
              assert.equal(result.status, 200);
              assert.equal(result.json.visits.length, 1);
              assert.equal(result.json.reports[0].id, reportId);
              assert.equal(
                (await call("/api/admissions", { cookie: john })).json
                  .admissions[0].id,
                admissionId,
              );
            },
          );
        },
      );
      await t.test(
        "demo database cannot be promoted with demo mode disabled",
        async () => {
          await stop();
          await start({ PORTAL_DEMO: "false" });
          assert.equal(
            (
              await call("/api/auth/login", {
                method: "POST",
                data: { email: "admin@hospital.com", password: "admin123" },
              })
            ).status,
            500,
          );
        },
      );
      await t.test(
        "configured bootstrap starts empty and uses explicit credentials",
        async () => {
          await stop();
          await start({
            PORTAL_DEMO: "false",
            PORTAL_DB_PATH: join(dir, "configured.sqlite"),
            PORTAL_ADMIN_EMAIL: "owner@example.test",
            PORTAL_ADMIN_PASSWORD: "configured-test-password",
          });
          const owner = await login(
            "owner@example.test",
            "configured-test-password",
          );
          assert.equal(
            (await call("/api/patients", { cookie: owner })).json.patients
              .length,
            0,
          );
          assert.equal(
            (
              await call("/api/auth/login", {
                method: "POST",
                data: { email: "admin@hospital.com", password: "admin123" },
              })
            ).status,
            401,
          );
        },
      );
    } finally {
      await stop();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
