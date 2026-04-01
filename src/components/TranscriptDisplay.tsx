'use client';

interface TranscriptDisplayProps {
  userTranscript: string;
  assistantResponse: string;
}

export function TranscriptDisplay({
  userTranscript,
  assistantResponse,
}: TranscriptDisplayProps) {
  if (!userTranscript && !assistantResponse) {
    return null;
  }

  return (
    <div
      aria-live="off"
      className="bg-muted rounded-xl p-4 max-h-48 overflow-y-auto"
    >
      {userTranscript && (
        <p className="text-base font-normal text-foreground">
          <span className="font-semibold">You:</span> {userTranscript}
        </p>
      )}
      {assistantResponse && (
        <p className="text-base font-normal text-foreground mt-2">
          {assistantResponse}
        </p>
      )}
    </div>
  );
}
