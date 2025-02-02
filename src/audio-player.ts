import { exec } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import { randomBytes } from 'crypto';

export class AudioPlayerManager {
  private currentProcess: any = null;

  // Create a temporary file for audio data
  private async createTempFile(data: Buffer): Promise<string> {
    const tempPath = join(tmpdir(), `mcp-audio-${randomBytes(16).toString('hex')}.tmp`);
    await writeFile(tempPath, data);
    return tempPath;
  }

  // Stop current playback
  public stopPlayback(): void {
    if (this.currentProcess) {
      try {
        // On Windows, we need to kill the process group
        process.platform === 'win32'
          ? exec('taskkill /F /T /PID ' + this.currentProcess.pid)
          : this.currentProcess.kill();
      } catch (error) {
        console.error('Error stopping playback:', error);
      }
      this.currentProcess = null;
    }
  }

  // Play audio data using platform-specific commands
  public async playAudioData(data: Buffer): Promise<void> {
    try {
      this.stopPlayback();
      
      const tempFile = await this.createTempFile(data);
      
      let command: string;
      if (process.platform === 'win32') {
        command = `start /WAIT "" "${tempFile}"`;
      } else if (process.platform === 'darwin') {
        command = `afplay "${tempFile}"`;
      } else {
        command = `aplay "${tempFile}"`;
      }

      this.currentProcess = exec(command, (error) => {
        if (error) {
          console.error('Error playing audio:', error);
        }
        // Cleanup temp file
        exec(`rm "${tempFile}"`, (err) => {
          if (err) console.error('Error cleaning up temp file:', err);
        });
        this.currentProcess = null;
      });

    } catch (error) {
      throw new Error(`Failed to play audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
