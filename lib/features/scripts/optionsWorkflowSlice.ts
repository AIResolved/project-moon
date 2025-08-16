import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface OptionsWorkflowState {
  currentStep: number
  completedSteps: number[]
}

const initialState: OptionsWorkflowState = {
  currentStep: 0,
  completedSteps: [],
}

export const optionsWorkflowSlice = createSlice({
  name: 'optionsWorkflow',
  initialState,
  reducers: {
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload
    },
    markStepCompleted: (state, action: PayloadAction<number>) => {
      const step = action.payload
      if (!state.completedSteps.includes(step)) {
        state.completedSteps.push(step)
        state.completedSteps.sort((a, b) => a - b)
      }
    },
    resetWorkflow: () => ({ ...initialState }),
  },
})

export const { setCurrentStep, markStepCompleted, resetWorkflow } = optionsWorkflowSlice.actions

export default optionsWorkflowSlice.reducer


