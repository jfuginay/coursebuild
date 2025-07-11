/**
 * Transcript Manager for Segmented Video Processing
 * 
 * Handles proper storage and merging of transcripts when processing videos in segments
 */

export interface TranscriptSegmentData {
  full_transcript: any[];
  key_concepts_timeline: any[];
  video_summary?: string;
}

/**
 * Save or update video transcript for segmented processing
 * 
 * For the first segment, creates a new transcript entry
 * For subsequent segments, updates the existing entry by merging transcript data
 */
export const saveOrUpdateTranscript = async (
  supabaseClient: any,
  courseId: string,
  videoUrl: string,
  segmentTranscript: TranscriptSegmentData,
  segmentInfo: {
    index: number;
    startTime: number;
    endTime: number;
    totalSegments: number;
  },
  processingTimeMs: number
): Promise<void> => {
  try {
    console.log(`💾 Processing transcript for segment ${segmentInfo.index + 1}/${segmentInfo.totalSegments}...`);
    
    if (segmentInfo.index === 0) {
      // First segment - create new transcript entry
      console.log('📝 Creating new transcript entry for first segment...');
      
      const transcriptData = {
        course_id: courseId,
        video_url: videoUrl,
        video_summary: segmentTranscript.video_summary || `Video segment 1 of ${segmentInfo.totalSegments}`,
        total_duration: segmentInfo.endTime, // Will be updated as more segments are processed
        full_transcript: segmentTranscript.full_transcript,
        key_concepts_timeline: segmentTranscript.key_concepts_timeline,
        model_used: 'gemini-2.0-flash',
        processing_time_ms: processingTimeMs,
        metadata: {
          is_segmented: true,
          total_segments: segmentInfo.totalSegments,
          segments_processed: 1
        }
      };
      
      const { error } = await supabaseClient
        .from('video_transcripts')
        .insert(transcriptData);
      
      if (error) {
        console.error('❌ Failed to create transcript:', error);
        throw new Error(`Failed to create transcript: ${error.message}`);
      }
      
      console.log('✅ Created initial transcript entry');
      
    } else {
      // Subsequent segments - merge with existing transcript
      console.log('🔄 Merging with existing transcript...');
      
      // Fetch existing transcript
      const { data: existingTranscript, error: fetchError } = await supabaseClient
        .from('video_transcripts')
        .select('*')
        .eq('course_id', courseId)
        .eq('video_url', videoUrl)
        .single();
      
      if (fetchError || !existingTranscript) {
        console.error('❌ Failed to fetch existing transcript:', fetchError);
        // Fallback: save as new entry (shouldn't happen in normal flow)
        await saveSegmentTranscriptFallback(
          supabaseClient,
          courseId,
          videoUrl,
          segmentTranscript,
          segmentInfo,
          processingTimeMs
        );
        return;
      }
      
      // Merge transcript segments
      const mergedTranscript = [
        ...(existingTranscript.full_transcript || []),
        ...segmentTranscript.full_transcript
      ];
      
      // Merge key concepts (avoiding duplicates)
      const existingConcepts = existingTranscript.key_concepts_timeline || [];
      const newConcepts = segmentTranscript.key_concepts_timeline || [];
      
      const mergedConcepts = [...existingConcepts];
      newConcepts.forEach((newConcept: any) => {
        if (!existingConcepts.find((c: any) => c.concept === newConcept.concept)) {
          mergedConcepts.push(newConcept);
        }
      });
      
      // Update metadata
      const metadata = existingTranscript.metadata || {};
      metadata.segments_processed = (metadata.segments_processed || 1) + 1;
      
      // Update summary if this is the last segment
      let updatedSummary = existingTranscript.video_summary;
      if (segmentInfo.index === segmentInfo.totalSegments - 1) {
        updatedSummary = `Complete video transcript (${segmentInfo.totalSegments} segments)`;
      }
      
      // Update the transcript
      const { error: updateError } = await supabaseClient
        .from('video_transcripts')
        .update({
          full_transcript: mergedTranscript,
          key_concepts_timeline: mergedConcepts,
          video_summary: updatedSummary,
          total_duration: segmentInfo.endTime,
          processing_time_ms: existingTranscript.processing_time_ms + processingTimeMs,
          metadata: metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTranscript.id);
      
      if (updateError) {
        console.error('❌ Failed to update transcript:', updateError);
        throw new Error(`Failed to update transcript: ${updateError.message}`);
      }
      
      console.log(`✅ Updated transcript with segment ${segmentInfo.index + 1} data`);
      console.log(`   📝 Total segments: ${mergedTranscript.length}`);
      console.log(`   🔑 Total concepts: ${mergedConcepts.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error managing transcript:', error);
    // Don't throw to avoid breaking the pipeline
    console.warn('⚠️ Continuing without proper transcript management...');
  }
};

/**
 * Fallback function to save segment transcript separately
 * Used when we can't find or merge with existing transcript
 */
const saveSegmentTranscriptFallback = async (
  supabaseClient: any,
  courseId: string,
  videoUrl: string,
  segmentTranscript: TranscriptSegmentData,
  segmentInfo: any,
  processingTimeMs: number
): Promise<void> => {
  console.warn('⚠️ Using fallback: saving segment transcript separately');
  
  const transcriptData = {
    course_id: courseId,
    video_url: `${videoUrl}#segment-${segmentInfo.index}`, // Make URL unique
    video_summary: `Segment ${segmentInfo.index + 1} of ${segmentInfo.totalSegments}`,
    total_duration: segmentInfo.endTime - segmentInfo.startTime,
    full_transcript: segmentTranscript.full_transcript,
    key_concepts_timeline: segmentTranscript.key_concepts_timeline,
    model_used: 'gemini-2.0-flash',
    processing_time_ms: processingTimeMs,
    metadata: {
      is_segment: true,
      segment_index: segmentInfo.index,
      segment_start: segmentInfo.startTime,
      segment_end: segmentInfo.endTime,
      total_segments: segmentInfo.totalSegments
    }
  };
  
  await supabaseClient
    .from('video_transcripts')
    .insert(transcriptData);
};

/**
 * Get complete transcript for a segmented video
 * Useful for retrieving the full transcript after all segments are processed
 */
export const getCompleteTranscript = async (
  supabaseClient: any,
  courseId: string,
  videoUrl: string
): Promise<any> => {
  const { data, error } = await supabaseClient
    .from('video_transcripts')
    .select('*')
    .eq('course_id', courseId)
    .eq('video_url', videoUrl)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    console.error('Failed to fetch complete transcript:', error);
    return null;
  }
  
  return data;
}; 