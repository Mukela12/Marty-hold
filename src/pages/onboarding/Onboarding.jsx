import { Routes, Route, Navigate } from 'react-router-dom';
import OnboardingStep2Enhanced from './OnboardingStep2Enhanced';
import OnboardingStep3Enhanced from './OnboardingStep3Enhanced';
import OnboardingStep4 from './OnboardingStep4';
import OnboardingStep5 from './OnboardingStep5';
import OnboardingStep6 from './OnboardingStep6';
import TargetAudience from '../campaign/v2/TargetAudience/TargetAudience';

const Onboarding = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="step1" replace />} />
      <Route path="step1" element={<TargetAudience />} />
      <Route path="step2" element={<OnboardingStep2Enhanced />} />
      <Route path="step3" element={<OnboardingStep3Enhanced />} />
      <Route path="step4" element={<OnboardingStep4 />} />
      <Route path="step5" element={<OnboardingStep5 />} />
      <Route path="step6" element={<OnboardingStep6 />} />
    </Routes>
  );
};

export default Onboarding;