// File: /src/features/contacts/components/ContactCard.test.tsx
// Tests for ContactCard component

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ContactCard, ContactCardProps } from './ContactCard'

// Mock contact data
const mockContact = {
  id: 'contact-1',
  project_id: 'project-123',
  first_name: 'John',
  last_name: 'Doe',
  company_name: 'Acme Corporation',
  email: 'john.doe@acme.com',
  phone_mobile: '555-123-4567',
  phone_office: '555-987-6543',
  phone_fax: '555-111-2222',
  contact_type: 'subcontractor',
  trade: 'electrical',
  title: 'Project Manager',
  address: '123 Main Street',
  city: 'Boston',
  state: 'MA',
  zip: '02101',
  is_primary: false,
  is_emergency_contact: false,
  notes: 'Preferred contact for electrical work',
  created_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
}

describe('ContactCard', () => {
  describe('rendering', () => {
    it('should render contact name', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should render company name when full name exists', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
    })

    it('should use company name as display name when no first/last name', () => {
      const contactWithoutName = {
        ...mockContact,
        first_name: null,
        last_name: null,
      }
      render(<ContactCard contact={contactWithoutName} />)
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
    })

    it('should show "Unnamed Contact" when no name or company', () => {
      const contactWithoutNameOrCompany = {
        ...mockContact,
        first_name: null,
        last_name: null,
        company_name: null,
      }
      render(<ContactCard contact={contactWithoutNameOrCompany} />)
      expect(screen.getByText('Unnamed Contact')).toBeInTheDocument()
    })

    it('should render contact title', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByText('Project Manager')).toBeInTheDocument()
    })

    it('should render contact type badge', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByText('subcontractor')).toBeInTheDocument()
    })

    it('should render trade badge', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByText('electrical')).toBeInTheDocument()
    })

    it('should render email as clickable link', () => {
      render(<ContactCard contact={mockContact} />)
      const emailLink = screen.getByText('john.doe@acme.com')
      expect(emailLink).toBeInTheDocument()
      expect(emailLink.closest('a')).toHaveAttribute('href', 'mailto:john.doe@acme.com')
    })

    it('should render mobile phone as clickable link', () => {
      render(<ContactCard contact={mockContact} />)
      const phoneLink = screen.getByText('555-123-4567')
      expect(phoneLink).toBeInTheDocument()
      expect(phoneLink.closest('a')).toHaveAttribute('href', 'tel:555-123-4567')
    })

    it('should render office phone as clickable link', () => {
      render(<ContactCard contact={mockContact} />)
      const phoneLink = screen.getByText('555-987-6543')
      expect(phoneLink).toBeInTheDocument()
      expect(phoneLink.closest('a')).toHaveAttribute('href', 'tel:555-987-6543')
    })

    it('should render fax number', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByText('555-111-2222')).toBeInTheDocument()
    })

    it('should render address', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByText('123 Main Street')).toBeInTheDocument()
      expect(screen.getByText('Boston, MA, 02101')).toBeInTheDocument()
    })

    it('should render notes', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByText('Preferred contact for electrical work')).toBeInTheDocument()
    })
  })

  describe('badges and indicators', () => {
    it('should show primary indicator when contact is primary', () => {
      const primaryContact = { ...mockContact, is_primary: true }
      render(<ContactCard contact={primaryContact} />)
      expect(screen.getByLabelText('Primary Contact')).toBeInTheDocument()
    })

    it('should not show primary indicator when not primary', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.queryByLabelText('Primary Contact')).not.toBeInTheDocument()
    })

    it('should show emergency badge when contact is emergency', () => {
      const emergencyContact = { ...mockContact, is_emergency_contact: true }
      render(<ContactCard contact={emergencyContact} />)
      expect(screen.getByText('Emergency')).toBeInTheDocument()
    })

    it('should not show emergency badge when not emergency', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.queryByText('Emergency')).not.toBeInTheDocument()
    })

    it('should show both primary and emergency badges', () => {
      const importantContact = {
        ...mockContact,
        is_primary: true,
        is_emergency_contact: true,
      }
      render(<ContactCard contact={importantContact} />)
      expect(screen.getByLabelText('Primary Contact')).toBeInTheDocument()
      expect(screen.getByText('Emergency')).toBeInTheDocument()
    })
  })

  describe('optional fields', () => {
    it('should not render title when not provided', () => {
      const contactWithoutTitle = { ...mockContact, title: null }
      render(<ContactCard contact={contactWithoutTitle} />)
      expect(screen.queryByText('Project Manager')).not.toBeInTheDocument()
    })

    it('should not render trade when not provided', () => {
      const contactWithoutTrade = { ...mockContact, trade: null }
      render(<ContactCard contact={contactWithoutTrade} />)
      expect(screen.queryByText('electrical')).not.toBeInTheDocument()
    })

    it('should not render email when not provided', () => {
      const contactWithoutEmail = { ...mockContact, email: null }
      render(<ContactCard contact={contactWithoutEmail} />)
      expect(screen.queryByText('john.doe@acme.com')).not.toBeInTheDocument()
    })

    it('should not render phones when not provided', () => {
      const contactWithoutPhones = {
        ...mockContact,
        phone_mobile: null,
        phone_office: null,
        phone_fax: null,
      }
      render(<ContactCard contact={contactWithoutPhones} />)
      expect(screen.queryByText('555-123-4567')).not.toBeInTheDocument()
      expect(screen.queryByText('555-987-6543')).not.toBeInTheDocument()
      expect(screen.queryByText('555-111-2222')).not.toBeInTheDocument()
    })

    it('should not render address when not provided', () => {
      const contactWithoutAddress = {
        ...mockContact,
        address: null,
        city: null,
        state: null,
        zip: null,
      }
      render(<ContactCard contact={contactWithoutAddress} />)
      expect(screen.queryByText('123 Main Street')).not.toBeInTheDocument()
    })

    it('should not render notes when not provided', () => {
      const contactWithoutNotes = { ...mockContact, notes: null }
      render(<ContactCard contact={contactWithoutNotes} />)
      expect(screen.queryByText('Preferred contact for electrical work')).not.toBeInTheDocument()
    })
  })

  describe('contact type colors', () => {
    const contactTypes = [
      'subcontractor',
      'architect',
      'engineer',
      'inspector',
      'supplier',
      'owner',
      'consultant',
      'other',
    ]

    contactTypes.forEach((type) => {
      it(`should render ${type} contact type`, () => {
        const contact = { ...mockContact, contact_type: type }
        render(<ContactCard contact={contact} />)
        expect(screen.getByText(type)).toBeInTheDocument()
      })
    })

    it('should handle unknown contact type gracefully', () => {
      const contact = { ...mockContact, contact_type: 'unknown_type' }
      render(<ContactCard contact={contact} />)
      expect(screen.getByText('unknown_type')).toBeInTheDocument()
    })
  })

  describe('click behavior', () => {
    it('should call onClick when card is clicked', () => {
      const handleClick = vi.fn()
      render(<ContactCard contact={mockContact} onClick={handleClick} />)

      const card = screen.getByText('John Doe').closest('.hover\\:shadow-md')
      fireEvent.click(card!)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should have cursor-pointer class when onClick provided', () => {
      const handleClick = vi.fn()
      render(<ContactCard contact={mockContact} onClick={handleClick} />)

      const card = screen.getByText('John Doe').closest('.hover\\:shadow-md')
      expect(card).toHaveClass('cursor-pointer')
    })

    it('should not have cursor-pointer class when no onClick', () => {
      render(<ContactCard contact={mockContact} />)

      const card = screen.getByText('John Doe').closest('.hover\\:shadow-md')
      expect(card).not.toHaveClass('cursor-pointer')
    })

    it('should stop propagation when clicking email link', () => {
      const handleClick = vi.fn()
      render(<ContactCard contact={mockContact} onClick={handleClick} />)

      const emailLink = screen.getByText('john.doe@acme.com')
      fireEvent.click(emailLink)

      // onClick should not be called when clicking the email link
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should stop propagation when clicking phone link', () => {
      const handleClick = vi.fn()
      render(<ContactCard contact={mockContact} onClick={handleClick} />)

      const phoneLink = screen.getByText('555-123-4567')
      fireEvent.click(phoneLink)

      // onClick should not be called when clicking the phone link
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('className prop', () => {
    it('should apply custom className', () => {
      render(<ContactCard contact={mockContact} className="custom-class" />)

      const card = screen.getByText('John Doe').closest('.hover\\:shadow-md')
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('address formatting', () => {
    it('should render partial address with city only', () => {
      const contact = {
        ...mockContact,
        address: null,
        city: 'Boston',
        state: null,
        zip: null,
      }
      render(<ContactCard contact={contact} />)
      expect(screen.getByText('Boston')).toBeInTheDocument()
    })

    it('should render partial address with state only', () => {
      const contact = {
        ...mockContact,
        address: null,
        city: null,
        state: 'MA',
        zip: null,
      }
      render(<ContactCard contact={contact} />)
      expect(screen.getByText('MA')).toBeInTheDocument()
    })

    it('should render city and state without zip', () => {
      const contact = {
        ...mockContact,
        address: null,
        city: 'Boston',
        state: 'MA',
        zip: null,
      }
      render(<ContactCard contact={contact} />)
      expect(screen.getByText('Boston, MA')).toBeInTheDocument()
    })
  })

  describe('phone badge labels', () => {
    it('should show Mobile badge for mobile phone', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByText('Mobile')).toBeInTheDocument()
    })

    it('should show Office badge for office phone', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByText('Office')).toBeInTheDocument()
    })

    it('should show Fax badge for fax number', () => {
      render(<ContactCard contact={mockContact} />)
      expect(screen.getByText('Fax')).toBeInTheDocument()
    })
  })
})
