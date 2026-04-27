import { AssemblyAI } from 'assemblyai';

function getClient(): AssemblyAI {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error('ASSEMBLYAI_API_KEY is not configured');
  return new AssemblyAI({ apiKey });
}

export async function submitTranscription(audioUrl: string): Promise<{ jobId: string }> {
  const client = getClient();
  const transcript = await client.transcripts.submit({ audio_url: audioUrl });
  return { jobId: transcript.id };
}

export type TranscriptResult =
  | { status: 'queued' | 'processing' }
  | { status: 'completed'; text: string }
  | { status: 'error'; error: string };

export async function getTranscriptStatus(jobId: string): Promise<TranscriptResult> {
  const client = getClient();
  const transcript = await client.transcripts.get(jobId);

  if (transcript.status === 'completed') {
    if (!transcript.text) {
      return { status: 'error', error: 'Transcript completed but no text returned' };
    }
    return { status: 'completed', text: transcript.text };
  }

  if (transcript.status === 'error') {
    return { status: 'error', error: transcript.error ?? 'Transcription failed' };
  }

  return { status: transcript.status as 'queued' | 'processing' };
}
