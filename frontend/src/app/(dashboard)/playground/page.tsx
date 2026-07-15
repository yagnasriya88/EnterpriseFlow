import { PlaygroundChat } from "@/components/PlaygroundChat";

export default function PlaygroundPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-heading-lg text-neutral-900">Agent Playground</h1>
        <p className="text-body-sm text-neutral-500">
          A sandbox to test how the agent responds before it ever talks to a real customer.
        </p>
      </div>
      <PlaygroundChat />
    </div>
  );
}
