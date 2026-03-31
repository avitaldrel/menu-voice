'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProfile, saveProfile } from '@/lib/indexeddb';
import type { UserProfile } from '@/lib/indexeddb';

type ProfileField = 'allergies' | 'preferences' | 'dislikes';

interface ProfileSectionProps {
  title: string;
  description: string;
  field: ProfileField;
  items: string[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
  inputLabel: string;
  inputPlaceholder: string;
}

function ProfileSection({
  title,
  description,
  field,
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  inputLabel,
  inputPlaceholder,
}: ProfileSectionProps) {
  const labelId = `${field}-label`;
  const inputId = `${field}-input`;

  return (
    <section className="mb-8" aria-labelledby={labelId}>
      <h2 id={labelId} className="text-xl font-semibold mb-1">
        {title}
      </h2>
      <p className="text-gray-600 mb-3 text-sm">{description}</p>

      {items.length === 0 ? (
        <p className="text-gray-500 italic mb-3">
          No {title.toLowerCase()} added yet
        </p>
      ) : (
        <ul className="mb-3 space-y-2" aria-label={`${title} list`}>
          {items.map((item) => (
            <li key={item} className="flex items-center justify-between gap-3">
              <span className="text-lg">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label={`Remove ${item}`}
                className="min-h-[48px] px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd();
        }}
        className="flex gap-2"
      >
        <label htmlFor={inputId} className="sr-only">
          {inputLabel}
        </label>
        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={inputPlaceholder}
          aria-label={inputLabel}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        />
        <button
          type="submit"
          className="min-h-[48px] bg-black text-white rounded-lg px-4 py-2 font-medium hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          {inputLabel}
        </button>
      </form>
    </section>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [allergyInput, setAllergyInput] = useState('');
  const [preferenceInput, setPreferenceInput] = useState('');
  const [dislikeInput, setDislikeInput] = useState('');

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p ?? { allergies: [], preferences: [], dislikes: [] });
      setLoading(false);
    });
  }, []);

  async function addItem(field: ProfileField, value: string) {
    if (!profile) return;
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || profile[field].includes(trimmed)) return;
    const updated: UserProfile = {
      ...profile,
      [field]: [...profile[field], trimmed],
    };
    await saveProfile(updated);
    setProfile(updated);
  }

  async function removeItem(field: ProfileField, value: string) {
    if (!profile) return;
    const updated: UserProfile = {
      ...profile,
      [field]: profile[field].filter((item) => item !== value),
    };
    await saveProfile(updated);
    setProfile(updated);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : (
        <>
          <ProfileSection
            title="Allergies"
            description="Items flagged as safety-critical in conversation"
            field="allergies"
            items={profile?.allergies ?? []}
            inputValue={allergyInput}
            onInputChange={setAllergyInput}
            onAdd={() => {
              addItem('allergies', allergyInput).then(() => setAllergyInput(''));
            }}
            onRemove={(item) => removeItem('allergies', item)}
            inputLabel="Add allergy"
            inputPlaceholder="e.g., peanuts, dairy, shellfish"
          />

          <ProfileSection
            title="Dislikes"
            description="Foods you dislike — flagged in conversation but not safety-critical"
            field="dislikes"
            items={profile?.dislikes ?? []}
            inputValue={dislikeInput}
            onInputChange={setDislikeInput}
            onAdd={() => {
              addItem('dislikes', dislikeInput).then(() => setDislikeInput(''));
            }}
            onRemove={(item) => removeItem('dislikes', item)}
            inputLabel="Add dislike"
            inputPlaceholder="e.g., cilantro, mushrooms, olives"
          />

          <ProfileSection
            title="Preferences"
            description="Dietary preferences and eating styles"
            field="preferences"
            items={profile?.preferences ?? []}
            inputValue={preferenceInput}
            onInputChange={setPreferenceInput}
            onAdd={() => {
              addItem('preferences', preferenceInput).then(() => setPreferenceInput(''));
            }}
            onRemove={(item) => removeItem('preferences', item)}
            inputLabel="Add preference"
            inputPlaceholder="e.g., vegetarian, gluten-free, low-sodium"
          />
        </>
      )}

      <Link
        href="/"
        className="inline-block px-4 py-2 bg-black text-white rounded-lg font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        Back to Home
      </Link>
    </div>
  );
}
