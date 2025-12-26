import React from 'react';
import * as z from "zod";
import toast from 'react-hot-toast'
import ProcessLayout from '../../../../components/process/ProcessLayout';
import { useForm } from "react-hook-form";
import { useNavigate } from 'react-router-dom';
import { Target, MapPin, TrendingUp, Sparkles } from 'lucide-react';
import { zodResolver } from "@hookform/resolvers/zod";
import "../../../../styles/design-system.css";

const TargetAudience = () => {
  /* variable and custom hooks */
  const zipCodes = [
    { zip: "43201", area: "Downtown Columbus", avg: 245 },
    { zip: "43202", area: "University District", avg: 312 },
    { zip: "43203", area: "Near East Side", avg: 178 },
    { zip: "43204", area: "Hilltop", avg: 156 },
    { zip: "43205", area: "Old Towne East", avg: 198 },
  ];
  const totalSteps = 5;
  const navigate = useNavigate();

  /* zod validation */
  const targetValidation = z.object({
    zipCodes: z.string()
    .min(1, "zip code is required")
    .regex(/^[0-9]{5,6}$/, "Enter a valid zip code")
  });

  /* React Hook Form To Manage The Zip Code With Zip Code Validation With handling the Loader as well */
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
        zipCodes: ""
    },
    resolver: zodResolver(targetValidation)
  });

  /* submit handler */
  const zipCodehandleSubmit = () => {
    try {
        
    } catch (error) {
      console.error(error);
    };
  };

  /* back button handler */
  const handleBack = () => {
    try {
        navigate('/campaign/step3');
    } catch (error) {
        console.error(error);
    };
  };

  /* forward button handler */
  const canContinue = () => {
    try {
        return errors?.zipCodes?.message ? true : false;
    } catch (error) {
        console.error(error);
    };
  };

  const handleContinue = async () => {
    if (errors?.zipCodes?.message) {
      toast.error('All ZIP codes must be valid before continuing. Please remove or fix invalid ZIP codes.');
      return;
    };

    localStorage.setItem('currentCampaignStep', '5');
    navigate('/campaign/step5');
  };
  return (
      <React.Fragment>
          <ProcessLayout
              currentStep={4}
              totalSteps={totalSteps}
              //    footerMessage="All ZIP codes must be valid before continuing. Invalid ZIP codes will block progress."
              onContinue={handleContinue}
              continueDisabled={!canContinue() || isSubmitting}
              continueText={isSubmitting ? 'Processing...' : 'Continue'}
              onSkip={() => navigate('/dashboard')}
              skipText="Cancel">
              <main className='animate-slide-up mt-10'>
                  <div className="min-h-screen px-6 py-10">
                      <section className="text-center">
                          <div className="inline-flex items-center gap-2 pl-4 pr-4 pt-2 pb-2 rounded-full bg-[#d2f1ea] text-[#2eb197] text-sm font-semibold mb-6">
                              <Target className="w-4 h-4" />
                              Step 4 of 4 • Targeting
                          </div>
                          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
                              Target your audience
                          </h1>
                          <p className="text-lg text-[#98aca8] text-center">
                              Select ZIP codes to reach new movers in your service area
                          </p>
                      </section>

                      {/* Layout */}
                      <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
                          <div className="lg:col-span-2 p-4">
                              <div className='rounded-2xl bg-white p-6 shadow-lg mb-4'>
                                  <div className="mb-6 flex items-center gap-3">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-white">
                                          <MapPin />
                                      </div>
                                      <div>
                                          <h3 className="font-semibold text-gray-900">
                                              ZIP Code Targeting
                                          </h3>
                                          <p className="text-sm text-gray-500">
                                              Add the ZIP codes where you want to reach new movers
                                          </p>
                                      </div>
                                  </div>

                                  {/* Input */}
                                  <div className="mb-6 flex gap-3">
                                      <input
                                          type="text"
                                          placeholder="# Enter 5-digit ZIP code"
                                          className="flex-1 rounded-xl border border-gray-200 pl-4 pr-4 pt-3 pb-3 text-sm focus:border-teal-500 focus:outline-none"
                                      />
                                      <button className="rounded-xl bg-teal-500 pl-6 pr-6 pt-3 pb-3 font-medium text-white hover:bg-teal-600">
                                          Add ZIP
                                      </button>
                                  </div>
                              </div>

                              {/* Selected ZIPs */}
                              <div className="rounded-2xl bg-white shadow-lg">
                                  <div className="flex items-start justify-between rounded-t-2xl bg-[#e9faf9] pt-4 pl-3 pr-3 pb-4">
                                      <div className="flex items-center gap-3">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                                              <Sparkles size={16} />
                                          </div>
                                          <div>
                                              <h3 className="font-semibold text-gray-900">
                                                  AI Suggested ZIP Codes
                                              </h3>
                                              <p className="text-sm text-gray-500">
                                                  Based on your business location
                                              </p>
                                          </div>
                                      </div>

                                      <button className="text-gray-400 hover:text-gray-600">?</button>
                                  </div>

                                  {/* ZIP List */}
                                  <div className="space-y-3 p-6">
                                      {zipCodes.map((item, index) => (
                                          <div key={item.zip} className="flex items-center justify-between rounded-xl bg-gray-50 pl-4 mt-2 pr-4 pt-3 pb-3">
                                              <div className="flex items-center gap-4">
                                                  <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-white text-sm font-semibold text-gray-700">
                                                      {String(index + 1).padStart(2, "0")}
                                                  </div>
                                                  <div>
                                                      <p className="font-medium text-gray-900">{item.zip}</p>
                                                      <p className="text-sm text-gray-500">{item.area}</p>
                                                  </div>
                                              </div>

                                              {/* Right */}
                                              <div className="flex items-center gap-6">
                                                  <div className="text-right">
                                                      <p className="font-medium text-gray-900">
                                                          {item.avg}
                                                      </p>
                                                      <p className="text-xs text-gray-500">avg/month</p>
                                                  </div>

                                                  <button className="rounded-2xl border border-gray-200 bg-white w-17.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                                                      Add
                                                  </button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>

                                  {/* Footer */}
                                  <div className="border-t pt-4 pb-4 pl-6 pr-6">
                                      <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 pt-3 pb-3 font-medium text-gray-700 hover:bg-gray-50">
                                          <TrendingUp size={16} />
                                          Add All Suggested ZIPs
                                      </button>
                                  </div>
                              </div>
                          </div>

                          <div className="rounded-2xl bg-white shadow-lg h-fit">
                              <div className="rounded-t-2xl bg-teal-500 pt-4 flex items-center justify-start gap-4 pb-4 pl-6 pr-6 text-white font-semibold">
                                  <TrendingUp /> Campaign Summary
                              </div>

                              <div className="space-y-4 p-6">
                                  <div className="rounded-xl bg-teal-50 p-4">
                                      <p className="text-sm text-gray-500">ZIP Codes Selected</p>
                                      <p className="text-2xl font-bold text-gray-900">
                                          {zipCodes.length}
                                      </p>
                                  </div>

                                  <div className="rounded-xl bg-teal-50 p-4 mt-3">
                                      <p className="text-sm text-gray-500">Est. Monthly Reach</p>
                                      <p className="text-2xl font-bold text-gray-900">1,110</p>
                                  </div>

                                  <div className="flex items-center justify-between rounded-xl border border-teal-200 p-4 mt-3">
                                      <span className="text-sm text-gray-600">
                                          Cost per postcard
                                      </span>
                                      <span className="text-xl font-bold text-teal-600">$0.89</span>
                                  </div>

                                  <div className="rounded-xl bg-green-50 p-4 text-green-700 mt-3">
                                      <p className="text-sm">
                                          Add ZIP codes to see your estimated
                                      </p>
                                      <p className="text-sm">
                                          reach
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </main>
          </ProcessLayout>
      </React.Fragment>
  );
};

export default TargetAudience;