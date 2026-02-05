"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  DashboardLayout,
  AnimatedCard,
  DashboardGrid,
} from "@/components/dashboard";
import {
  UserPlus,
  User,
  Phone,
  Calendar,
  MapPin,
  FileText,
  Stethoscope,
  Heart,
  AlertCircle,
  Check,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

export default function AddPatientPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    bloodGroup: "",
    admissionType: "",
    ward: "",
    symptoms: "",
    diagnosis: "",
    doctor: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    toast.success("Patient added successfully");
    // Reset form
    setStep(1);
    setFormData({
      firstName: "",
      lastName: "",
      age: "",
      gender: "",
      phone: "",
      email: "",
      address: "",
      emergencyContact: "",
      emergencyPhone: "",
      bloodGroup: "",
      admissionType: "",
      ward: "",
      symptoms: "",
      diagnosis: "",
      doctor: "",
    });
  };

  const steps = [
    { number: 1, title: "Personal Info", icon: User },
    { number: 2, title: "Contact Details", icon: Phone },
    { number: 3, title: "Medical Info", icon: Heart },
    { number: 4, title: "Admission", icon: FileText },
  ];

  return (
    <DashboardLayout
      role="medical-staff"
      title="Add New Patient"
      breadcrumbs={[
        { label: "Dashboard", href: "/medical-staff" },
        { label: "Add Patient" },
      ]}
      userName="Dr. Priya Singh"
      userRole="Medical Staff"
    >
      <div className="space-y-6">
        {/* Progress Steps */}
        <AnimatedCard>
          <div className="flex items-center justify-between">
            {steps.map((s, index) => (
              <div key={s.number} className="flex items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                      step >= s.number
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {step > s.number ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <s.icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <p className={`text-sm font-medium ${step >= s.number ? "text-foreground" : "text-muted-foreground"}`}>
                      Step {s.number}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.title}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="mx-4 h-5 w-5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </AnimatedCard>

        {/* Form Steps */}
        {step === 1 && (
          <AnimatedCard>
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              <p className="text-sm text-muted-foreground">Enter the patient's personal details</p>
            </div>
            <div className="grid gap-6 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    placeholder="Enter age"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Gender *</Label>
                  <Select value={formData.gender} onValueChange={(v) => handleInputChange("gender", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Blood Group</Label>
                <Select value={formData.bloodGroup} onValueChange={(v) => handleInputChange("bloodGroup", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AnimatedCard>
        )}

        {step === 2 && (
          <AnimatedCard>
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Contact Details</h3>
              <p className="text-sm text-muted-foreground">Enter the patient's contact information</p>
            </div>
            <div className="grid gap-6 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+91 98765-43210"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="patient@email.com"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Enter complete address"
                />
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Emergency Contact</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyContact">Contact Name *</Label>
                    <Input
                      id="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyPhone">Contact Phone *</Label>
                    <Input
                      id="emergencyPhone"
                      value={formData.emergencyPhone}
                      onChange={(e) => handleInputChange("emergencyPhone", e.target.value)}
                      placeholder="+91 98765-43210"
                    />
                  </div>
                </div>
              </div>
            </div>
          </AnimatedCard>
        )}

        {step === 3 && (
          <AnimatedCard>
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Medical Information</h3>
              <p className="text-sm text-muted-foreground">Enter the patient's medical details</p>
            </div>
            <div className="grid gap-6 max-w-2xl">
              <div className="grid gap-2">
                <Label htmlFor="symptoms">Symptoms / Complaints *</Label>
                <Textarea
                  id="symptoms"
                  value={formData.symptoms}
                  onChange={(e) => handleInputChange("symptoms", e.target.value)}
                  placeholder="Describe the patient's symptoms..."
                  rows={4}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="diagnosis">Preliminary Diagnosis</Label>
                <Input
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                  placeholder="Enter preliminary diagnosis"
                />
              </div>
              <div className="grid gap-2">
                <Label>Admission Type *</Label>
                <RadioGroup
                  value={formData.admissionType}
                  onValueChange={(v) => handleInputChange("admissionType", v)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="emergency" id="emergency" />
                    <Label htmlFor="emergency" className="font-normal">Emergency</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="planned" id="planned" />
                    <Label htmlFor="planned" className="font-normal">Planned</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="referral" id="referral" />
                    <Label htmlFor="referral" className="font-normal">Referral</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </AnimatedCard>
        )}

        {step === 4 && (
          <AnimatedCard>
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Admission Details</h3>
              <p className="text-sm text-muted-foreground">Assign ward and doctor</p>
            </div>
            <div className="grid gap-6 max-w-2xl">
              <div className="grid gap-2">
                <Label>Ward *</Label>
                <Select value={formData.ward} onValueChange={(v) => handleInputChange("ward", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ward" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="icu">ICU</SelectItem>
                    <SelectItem value="general">General Ward</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="pediatric">Pediatric</SelectItem>
                    <SelectItem value="maternity">Maternity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Assigned Doctor *</Label>
                <Select value={formData.doctor} onValueChange={(v) => handleInputChange("doctor", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dr-sharma">Dr. Sharma (Cardiologist)</SelectItem>
                    <SelectItem value="dr-patel">Dr. Patel (General Medicine)</SelectItem>
                    <SelectItem value="dr-singh">Dr. Singh (Emergency)</SelectItem>
                    <SelectItem value="dr-gupta">Dr. Gupta (Pediatrician)</SelectItem>
                    <SelectItem value="dr-reddy">Dr. Reddy (Gynecologist)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <div className="rounded-lg border bg-muted/50 p-4 mt-4">
                <h4 className="font-semibold mb-3">Patient Summary</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{formData.firstName} {formData.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age/Gender:</span>
                    <span>{formData.age} years, {formData.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{formData.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Admission Type:</span>
                    <span className="capitalize">{formData.admissionType}</span>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedCard>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            Previous
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep((s) => Math.min(4, s + 1))}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Patient
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
