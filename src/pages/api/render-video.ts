import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { compositionId, props = {} } = req.body;

    if (!compositionId) {
      return res.status(400).json({ message: 'Composition ID is required' });
    }

    console.log('Starting video render for composition:', compositionId);

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'public', 'rendered-videos');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Clean up old video files (keep only last 10 files)
    try {
      const files = fs.readdirSync(outputDir)
        .filter(file => file.endsWith('.mp4'))
        .map(file => ({
          name: file,
          path: path.join(outputDir, file),
          mtime: fs.statSync(path.join(outputDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      if (files.length > 10) {
        const filesToDelete = files.slice(10);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          console.log('Cleaned up old video file:', file.name);
        }
      }
    } catch (cleanupError) {
      console.warn('Error during cleanup:', cleanupError);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const outputPath = path.join(outputDir, `${compositionId}-${timestamp}.mp4`);

    console.log('Starting render to:', outputPath);

    // Use Remotion CLI to render the video
    const remotionCommand = [
      'npx', 'remotion', 'render',
      'remotion/index.ts',
      compositionId,
      `"${outputPath}"`,
      '--props', `'${JSON.stringify(props)}'`,
      '--codec', 'h264',
      '--concurrency', '1' // Limit concurrency to prevent memory issues
    ].join(' ');

    console.log('Executing command:', remotionCommand);

    // Execute the render command with timeout
    const { stdout, stderr } = await execAsync(remotionCommand, {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      timeout: 300000, // 5 minutes timeout
    });

    console.log('Render stdout:', stdout);
    if (stderr) {
      console.log('Render stderr:', stderr);
    }

    // Check if file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error('Video file was not created');
    }

    console.log('Render completed successfully');

    // Return the download URL
    const downloadUrl = `/rendered-videos/${path.basename(outputPath)}`;
    
    res.status(200).json({
      success: true,
      downloadUrl,
      message: 'Video rendered successfully',
    });

  } catch (error) {
    console.error('Error rendering video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to render video',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Increase the timeout for video rendering
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  maxDuration: 300, // 5 minutes
};