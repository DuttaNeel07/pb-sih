'use client';
import { motion } from 'framer-motion';
import Slider from '@/components/ui/Slider';
import ValidatedInput from '@/components/ui/ValidatedInput';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { branchOptions } from '@/data/branches';

interface TeamLeaderData {
  name: string;
  email: string;
  phone: string;
  year: string;
  branch: string;
  gender: string;
  otherGender?: string;
}

interface TeamLeaderProps {
  teamLeader: TeamLeaderData;
  onInputChange: (section: string, field: string, value: string) => void;
  isDataFromAuth?: boolean; // New prop to indicate if data is from authentication
  emailError?: string;
  phoneError?: string;
  isEmailLocked?: boolean; // New prop to lock the email field
}

const yearOptions = [
  { value: '1st', label: '1st' },
  { value: '2nd', label: '2nd' },
  { value: '3rd', label: '3rd' },
  { value: '4th', label: '4th' }
];

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' }
];

export default function TeamLeader({ teamLeader, onInputChange, isDataFromAuth = false, emailError, phoneError, isEmailLocked = false }: TeamLeaderProps) {
  return (
    <div>
      {/* Info message when data is pre-filled */}
      {isDataFromAuth && (teamLeader.name || teamLeader.email) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-heading/10 border border-heading/30 rounded-lg"
        >
          <div className="flex items-center gap-2 text-heading text-sm font-body">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Your name and email have been automatically filled from your account. You can modify your name but the email is locked and cannot be changed.</span>
          </div>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ValidatedInput
          label="Full Name"
          type="text"
          value={teamLeader.name}
          onChange={(value) => onInputChange('teamLeader', 'name', value)}
          placeholder="Enter full name"
          required
          validationType="name"
        />
        <ValidatedInput
          label="Email"
          type="email"
          value={teamLeader.email}
          onChange={(value) => onInputChange('teamLeader', 'email', value)}
          placeholder="Enter email address"
          required
          validationType="email"
          error={emailError}
          disabled={isEmailLocked}
        />
        <ValidatedInput
          label="Phone"
          type="tel"
          value={teamLeader.phone}
          onChange={(value) => onInputChange('teamLeader', 'phone', value)}
          placeholder="Enter phone number"
          required
          validationType="phone"
          error={phoneError}
        />
        <div>
          <Slider
            options={yearOptions}
            value={teamLeader.year}
            onChange={(value) => onInputChange('teamLeader', 'year', value)}
            label="Year of Study"
            required
          />
        </div>
        <div>
          <Slider
            options={genderOptions}
            value={teamLeader.gender}
            onChange={(value) => onInputChange('teamLeader', 'gender', value)}
            label="Gender"
            showOtherInput={true}
            otherValue={teamLeader.otherGender || ''}
            onOtherChange={(value) => onInputChange('teamLeader', 'otherGender', value)}
            required
          />
        </div>
        <div>
          <CustomDropdown
            options={branchOptions}
            value={teamLeader.branch}
            onChange={(value) => onInputChange('teamLeader', 'branch', value)}
            label="Branch"
            placeholder="Select your branch"
            required
          />
        </div>
      </div>
    </div>
  );
}
