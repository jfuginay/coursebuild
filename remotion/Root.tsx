import React from 'react';
import { Composition } from 'remotion';
import { MyComposition } from './Composition';
import { CourseSummary } from './CourseSummary';
import { QuestionStats } from './QuestionStats';
import { ProgressAnimation } from './ProgressAnimation';
import { VectorCafeScene } from './VectorCafeScene';
import { VectorCafeSceneV2 } from './VectorCafeSceneV2';
import { ParadoxOfLight } from './ParadoxOfLight';
import { ParadoxOfLightV2 } from './ParadoxOfLightV2';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CourseForgeIntro"
        component={MyComposition}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="CourseSummary"
        component={CourseSummary}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Introduction to React',
          description: 'Learn the fundamentals of React development',
          duration: '45 min',
          questionsCount: 12,
          segmentsCount: 8,
        }}
      />
      <Composition
        id="QuestionStats"
        component={QuestionStats}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          totalQuestions: 12,
          correctAnswers: 9,
          wrongAnswers: 3,
          accuracy: 75,
        }}
      />
      <Composition
        id="ProgressAnimation"
        component={ProgressAnimation}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          courseName: 'Introduction to React',
          progress: 85,
          completedSections: 7,
          totalSections: 8,
        }}
      />
      <Composition
        id="VectorCafe"
        component={VectorCafeScene}
        durationInFrames={960}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="VectorCafeV2"
        component={VectorCafeSceneV2}
        durationInFrames={510}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="ParadoxOfLight"
        component={ParadoxOfLight}
        durationInFrames={750}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="ParadoxOfLightV2"
        component={ParadoxOfLightV2}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};