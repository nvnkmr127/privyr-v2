"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { createAutomation } from "@/lib/actions/automations";

export function AutomationBuilder({ initialData = null }: { initialData?: any }) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || "");
  const [trigger, setTrigger] = useState(initialData?.trigger?.type || "lead.created");
  const [conditionField, setConditionField] = useState(initialData?.conditions?.field || "");
  const [conditionOp, setConditionOp] = useState(initialData?.conditions?.operator || "equals");
  const [conditionVal, setConditionVal] = useState(initialData?.conditions?.value || "");
  const [actionType, setActionType] = useState(initialData?.actions?.[0]?.type || "assign_lead");
  const [actionConfigStr, setActionConfigStr] = useState(JSON.stringify(initialData?.actions?.[0]?.config || {}));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = {
        name,
        isActive: true,
        trigger: { type: trigger, config: {} },
        conditions: conditionField ? { field: conditionField, operator: conditionOp, value: conditionVal } : null,
        actions: [{ type: actionType, config: JSON.parse(actionConfigStr) }],
      };

      await createAutomation(data);
      router.push("/automations");
    } catch (e) {
      console.error(e);
      alert("Failed to save automation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="space-y-2">
        <Label>Automation Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Assign Facebook Leads" />
      </div>

      <div className="border p-4 rounded-md space-y-4">
        <h3 className="font-semibold text-lg">WHEN (Trigger)</h3>
        <Select value={trigger} onValueChange={setTrigger}>
          <SelectTrigger><SelectValue placeholder="Select Trigger" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lead.created">Lead Created</SelectItem>
            <SelectItem value="lead.assigned">Lead Assigned</SelectItem>
            <SelectItem value="lead.status_changed">Lead Status Changed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border p-4 rounded-md space-y-4">
        <h3 className="font-semibold text-lg">IF (Condition) - Optional</h3>
        <div className="flex gap-2">
          <Input placeholder="Field (e.g. source)" value={conditionField} onChange={(e) => setConditionField(e.target.value)} />
          <Select value={conditionOp} onValueChange={setConditionOp}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Operator" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="equals">Equals</SelectItem>
              <SelectItem value="not_equals">Not Equals</SelectItem>
              <SelectItem value="contains">Contains</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Value" value={conditionVal} onChange={(e) => setConditionVal(e.target.value)} />
        </div>
      </div>

      <div className="border p-4 rounded-md space-y-4">
        <h3 className="font-semibold text-lg">THEN (Action)</h3>
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger><SelectValue placeholder="Select Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="assign_lead">Assign Lead</SelectItem>
            <SelectItem value="change_status">Change Status</SelectItem>
            <SelectItem value="add_note">Add Note</SelectItem>
            <SelectItem value="create_task">Create Task</SelectItem>
          </SelectContent>
        </Select>
        <div>
          <Label>Action Config (JSON)</Label>
          <Input value={actionConfigStr} onChange={(e) => setActionConfigStr(e.target.value)} placeholder='{"userId": "..."}' />
        </div>
      </div>

      <Button onClick={handleSave} disabled={loading || !name}>Save Automation</Button>
    </div>
  );
}
