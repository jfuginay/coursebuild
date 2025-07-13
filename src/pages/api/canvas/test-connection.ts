import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { canvasUrl, accessToken } = req.body;

    if (!canvasUrl || !accessToken) {
      return res.status(400).json({ error: 'Canvas URL and access token are required' });
    }

    // Validate Canvas URL format
    const urlPattern = /^https?:\/\/.+\.instructure\.com\/?$/;
    if (!urlPattern.test(canvasUrl)) {
      return res.status(400).json({ 
        error: 'Invalid Canvas URL. Expected format: https://institution.instructure.com' 
      });
    }

    // Test the connection by calling Canvas API
    const apiUrl = `${canvasUrl.replace(/\/$/, '')}/api/v1/users/self`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid access token' });
      } else if (response.status === 404) {
        return res.status(404).json({ error: 'Canvas API endpoint not found. Please check your Canvas URL.' });
      } else {
        return res.status(response.status).json({ 
          error: `Canvas API error: ${response.statusText}` 
        });
      }
    }

    const userData = await response.json();

    // Return user info to confirm connection
    return res.status(200).json({
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
      },
      message: 'Successfully connected to Canvas',
    });

  } catch (error) {
    console.error('Canvas connection test error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to test Canvas connection' 
    });
  }
}