import { useState } from 'react';

const useExample = () => {
  const [exampleState, setExampleState] = useState<any | null>(null);

  const updateExampleState = (newState: any) => {
    setExampleState(newState);
  };

  return {
    exampleState,
    updateExampleState,
  };
};

export { useExample };
