import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../page';

// Mock the indexeddb module
vi.mock('@/lib/indexeddb', () => ({
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
}));

import { getProfile, saveProfile } from '@/lib/indexeddb';

const mockGetProfile = vi.mocked(getProfile);
const mockSaveProfile = vi.mocked(saveProfile);

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveProfile.mockResolvedValue(undefined);
});

describe('SettingsPage', () => {
  describe('Test 1: Basic rendering', () => {
    it('renders heading "Settings" and "Back to Home" link', async () => {
      mockGetProfile.mockResolvedValue(null);
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
      });
    });
  });

  describe('Test 2: Empty state', () => {
    it('shows empty state message for all three sections when no profile exists', async () => {
      mockGetProfile.mockResolvedValue(null);
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/no allergies added yet/i)).toBeInTheDocument();
        expect(screen.getByText(/no preferences added yet/i)).toBeInTheDocument();
        expect(screen.getByText(/no dislikes added yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Test 3: Profile data display', () => {
    it('shows allergies from profile as list items', async () => {
      mockGetProfile.mockResolvedValue({
        allergies: ['dairy', 'nuts'],
        preferences: [],
        dislikes: [],
      });
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('dairy')).toBeInTheDocument();
        expect(screen.getByText('nuts')).toBeInTheDocument();
      });
    });
  });

  describe('Test 4: Add allergy', () => {
    it('allows user to type "shellfish" and submit to add it — saveProfile called with updated list', async () => {
      const user = userEvent.setup();
      mockGetProfile.mockResolvedValue({
        allergies: ['dairy'],
        preferences: [],
        dislikes: [],
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('dairy')).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/add allergy/i);
      await user.type(input, 'shellfish');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockSaveProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            allergies: expect.arrayContaining(['dairy', 'shellfish']),
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('shellfish')).toBeInTheDocument();
      });
    });
  });

  describe('Test 5: Remove allergy', () => {
    it('allows user to click remove button next to "dairy" to remove it — saveProfile reflects removal', async () => {
      const user = userEvent.setup();
      mockGetProfile.mockResolvedValue({
        allergies: ['dairy', 'nuts'],
        preferences: [],
        dislikes: [],
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('dairy')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /remove dairy/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockSaveProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            allergies: ['nuts'],
          })
        );
      });

      await waitFor(() => {
        expect(screen.queryByText('dairy')).not.toBeInTheDocument();
      });
    });
  });

  describe('Test 6: No duplicate allergies', () => {
    it('does not add a duplicate allergy that is already in the list', async () => {
      const user = userEvent.setup();
      mockGetProfile.mockResolvedValue({
        allergies: ['dairy'],
        preferences: [],
        dislikes: [],
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('dairy')).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/add allergy/i);
      await user.type(input, 'dairy');
      await user.keyboard('{Enter}');

      // saveProfile should NOT be called — duplicate
      expect(mockSaveProfile).not.toHaveBeenCalled();

      // Still only one instance of 'dairy'
      expect(screen.getAllByText('dairy')).toHaveLength(1);
    });
  });

  describe('Test 7: Empty input prevention', () => {
    it('does not add empty string when submitted with empty input', async () => {
      const user = userEvent.setup();
      mockGetProfile.mockResolvedValue({
        allergies: [],
        preferences: [],
        dislikes: [],
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/no allergies added yet/i)).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add allergy/i });
      await user.click(addButton);

      expect(mockSaveProfile).not.toHaveBeenCalled();
      expect(screen.getByText(/no allergies added yet/i)).toBeInTheDocument();
    });
  });

  describe('Test 8: Dislikes section', () => {
    it('can add and remove dislikes independently', async () => {
      const user = userEvent.setup();
      mockGetProfile.mockResolvedValue({
        allergies: [],
        preferences: [],
        dislikes: ['cilantro'],
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('cilantro')).toBeInTheDocument();
      });

      // Add a dislike
      const dislikeInput = screen.getByLabelText(/add dislike/i);
      await user.type(dislikeInput, 'mushrooms');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockSaveProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            dislikes: expect.arrayContaining(['cilantro', 'mushrooms']),
          })
        );
      });

      // Remove cilantro
      vi.clearAllMocks();
      mockSaveProfile.mockResolvedValue(undefined);

      await waitFor(() => {
        expect(screen.getByText('mushrooms')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /remove cilantro/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockSaveProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            dislikes: expect.not.arrayContaining(['cilantro']),
          })
        );
      });
    });
  });

  describe('Test 9: Preferences section', () => {
    it('can add and remove preferences independently', async () => {
      const user = userEvent.setup();
      mockGetProfile.mockResolvedValue({
        allergies: [],
        preferences: ['vegetarian'],
        dislikes: [],
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('vegetarian')).toBeInTheDocument();
      });

      // Add a preference
      const prefInput = screen.getByLabelText(/add preference/i);
      await user.type(prefInput, 'gluten-free');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockSaveProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            preferences: expect.arrayContaining(['vegetarian', 'gluten-free']),
          })
        );
      });

      // Remove vegetarian
      vi.clearAllMocks();
      mockSaveProfile.mockResolvedValue(undefined);

      await waitFor(() => {
        expect(screen.getByText('gluten-free')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /remove vegetarian/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockSaveProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            preferences: expect.not.arrayContaining(['vegetarian']),
          })
        );
      });
    });
  });

  describe('Test 10: Accessibility', () => {
    it('all interactive elements have accessible names (aria-label or visible label)', async () => {
      mockGetProfile.mockResolvedValue({
        allergies: ['peanuts'],
        preferences: ['vegan'],
        dislikes: ['olives'],
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('peanuts')).toBeInTheDocument();
      });

      // Inputs should have accessible labels
      expect(screen.getByLabelText(/add allergy/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add preference/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add dislike/i)).toBeInTheDocument();

      // Remove buttons should have accessible names
      expect(screen.getByRole('button', { name: /remove peanuts/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remove vegan/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remove olives/i })).toBeInTheDocument();
    });
  });
});
