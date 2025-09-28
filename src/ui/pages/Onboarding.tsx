import { useState } from "react";

export default function Onboarding() {
  const [step, setStep] = useState(1);

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        {/* Progress Bar */}
        <div className="flex items-center mb-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`flex-1 h-2 mx-1 rounded ${
                step >= n ? "bg-blue-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Welcome to StepHabit 🎉</h2>
            <p className="mb-6">Let's get started by creating your account.</p>
            <button
              onClick={next}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Signup Form */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Sign Up</h2>
            <input
              type="email"
              placeholder="Email"
              className="w-full border p-2 rounded mb-4"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full border p-2 rounded mb-4"
            />
            <div className="flex justify-between">
              <button onClick={back} className="px-4 py-2 border rounded">
                Back
              </button>
              <button
                onClick={next}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-4">All Set!</h2>
            <p className="mb-6">You’re ready to start building habits 🚀</p>
            <button className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600">
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}