import { Button } from "./Button";

export const MultiStepFormWizard = ({ currentStep, onStepChange, steps, children }) => (
  <div className="wizard">
    <nav aria-label="Form progress">
      <ol>
        {steps.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              className={index === currentStep ? "active" : ""}
              aria-current={index === currentStep ? "step" : undefined}
              onClick={() => onStepChange(index)}
            >
              <span>{index + 1}</span>
              {step.label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
    <div className="wizard-content">
      {children}
      <div className="wizard-actions">
        <Button
          type="button"
          variant="ghost"
          disabled={currentStep === 0}
          onClick={() => onStepChange(currentStep - 1)}
        >
          Back
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={currentStep === steps.length - 1}
          onClick={() => onStepChange(currentStep + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  </div>
);
