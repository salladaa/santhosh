import { requireApi } from "@/lib/auth";
import { apiError, body, json } from "@/lib/http";
import { object, textField } from "@/lib/care";
import { InputError } from "@/lib/validation";
import {
  workflowSnapshot,
  sendToQueue,
  claimEncounter,
  releaseEncounter,
  confirmConsultation,
  updateLab,
  updatePharmacy,
} from "@/lib/workflow";
export async function GET() {
  try {
    return json(workflowSnapshot(await requireApi(false, true)));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireApi(false, true),
      data = object(await body(request)),
      action = textField(data, "action", 40);
    if (action === "intake") return json({ id: sendToQueue(data, user) }, 201);
    const id = textField(data, "id", 100);
    if (action === "claim") claimEncounter(id, data, user);
    else if (action === "release") releaseEncounter(id, data, user);
    else if (action === "confirm")
      return json({ id: confirmConsultation(id, data, user) }, 201);
    else if (action === "lab") updateLab(id, data, user);
    else if (action === "pharmacy") updatePharmacy(id, data, user);
    else throw new InputError("Unknown workflow action.");
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
