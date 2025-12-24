// File: /src/components/ui/csi-spec-picker.tsx
// CSI MasterFormat Spec Section Picker for Construction Submittals and RFIs

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, ChevronDown, ChevronRight, X } from 'lucide-react'

// CSI MasterFormat 2020 Division Structure
// This is the industry standard for organizing construction specifications
export const CSI_DIVISIONS = [
  { code: '00', title: 'Procurement and Contracting Requirements' },
  { code: '01', title: 'General Requirements' },
  { code: '02', title: 'Existing Conditions' },
  { code: '03', title: 'Concrete' },
  { code: '04', title: 'Masonry' },
  { code: '05', title: 'Metals' },
  { code: '06', title: 'Wood, Plastics, and Composites' },
  { code: '07', title: 'Thermal and Moisture Protection' },
  { code: '08', title: 'Openings' },
  { code: '09', title: 'Finishes' },
  { code: '10', title: 'Specialties' },
  { code: '11', title: 'Equipment' },
  { code: '12', title: 'Furnishings' },
  { code: '13', title: 'Special Construction' },
  { code: '14', title: 'Conveying Equipment' },
  { code: '21', title: 'Fire Suppression' },
  { code: '22', title: 'Plumbing' },
  { code: '23', title: 'Heating, Ventilating, and Air Conditioning (HVAC)' },
  { code: '25', title: 'Integrated Automation' },
  { code: '26', title: 'Electrical' },
  { code: '27', title: 'Communications' },
  { code: '28', title: 'Electronic Safety and Security' },
  { code: '31', title: 'Earthwork' },
  { code: '32', title: 'Exterior Improvements' },
  { code: '33', title: 'Utilities' },
  { code: '34', title: 'Transportation' },
  { code: '35', title: 'Waterway and Marine Construction' },
  { code: '40', title: 'Process Interconnections' },
  { code: '41', title: 'Material Processing and Handling Equipment' },
  { code: '42', title: 'Process Heating, Cooling, and Drying Equipment' },
  { code: '43', title: 'Process Gas and Liquid Handling, Purification, and Storage Equipment' },
  { code: '44', title: 'Pollution and Waste Control Equipment' },
  { code: '45', title: 'Industry-Specific Manufacturing Equipment' },
  { code: '46', title: 'Water and Wastewater Equipment' },
  { code: '48', title: 'Electrical Power Generation' },
] as const

// Common spec sections within divisions (most frequently used in commercial construction)
export const CSI_SPEC_SECTIONS: { [division: string]: Array<{ code: string; title: string }> } = {
  '03': [
    { code: '03 10 00', title: 'Concrete Forming and Accessories' },
    { code: '03 20 00', title: 'Concrete Reinforcing' },
    { code: '03 30 00', title: 'Cast-in-Place Concrete' },
    { code: '03 35 00', title: 'Concrete Finishing' },
    { code: '03 40 00', title: 'Precast Concrete' },
    { code: '03 45 00', title: 'Precast Architectural Concrete' },
    { code: '03 50 00', title: 'Cast Decks and Underlayment' },
    { code: '03 60 00', title: 'Grouting' },
  ],
  '04': [
    { code: '04 20 00', title: 'Unit Masonry' },
    { code: '04 21 00', title: 'Clay Unit Masonry' },
    { code: '04 22 00', title: 'Concrete Unit Masonry' },
    { code: '04 40 00', title: 'Stone Assemblies' },
    { code: '04 70 00', title: 'Manufactured Masonry' },
  ],
  '05': [
    { code: '05 10 00', title: 'Structural Metal Framing' },
    { code: '05 12 00', title: 'Structural Steel Framing' },
    { code: '05 21 00', title: 'Steel Joist Framing' },
    { code: '05 31 00', title: 'Steel Decking' },
    { code: '05 40 00', title: 'Cold-Formed Metal Framing' },
    { code: '05 50 00', title: 'Metal Fabrications' },
    { code: '05 51 00', title: 'Metal Stairs' },
    { code: '05 52 00', title: 'Metal Railings' },
    { code: '05 70 00', title: 'Decorative Metal' },
  ],
  '06': [
    { code: '06 10 00', title: 'Rough Carpentry' },
    { code: '06 16 00', title: 'Sheathing' },
    { code: '06 20 00', title: 'Finish Carpentry' },
    { code: '06 40 00', title: 'Architectural Woodwork' },
    { code: '06 60 00', title: 'Plastic Fabrications' },
  ],
  '07': [
    { code: '07 10 00', title: 'Dampproofing and Waterproofing' },
    { code: '07 20 00', title: 'Thermal Protection' },
    { code: '07 21 00', title: 'Thermal Insulation' },
    { code: '07 25 00', title: 'Weather Barriers' },
    { code: '07 30 00', title: 'Steep Slope Roofing' },
    { code: '07 50 00', title: 'Membrane Roofing' },
    { code: '07 60 00', title: 'Flashing and Sheet Metal' },
    { code: '07 70 00', title: 'Roof and Wall Specialties and Accessories' },
    { code: '07 80 00', title: 'Fire and Smoke Protection' },
    { code: '07 90 00', title: 'Joint Protection' },
    { code: '07 92 00', title: 'Joint Sealants' },
  ],
  '08': [
    { code: '08 10 00', title: 'Doors and Frames' },
    { code: '08 11 00', title: 'Metal Doors and Frames' },
    { code: '08 14 00', title: 'Wood Doors' },
    { code: '08 30 00', title: 'Specialty Doors and Frames' },
    { code: '08 40 00', title: 'Entrances, Storefronts, and Curtain Walls' },
    { code: '08 44 00', title: 'Curtain Wall and Glazed Assemblies' },
    { code: '08 50 00', title: 'Windows' },
    { code: '08 70 00', title: 'Hardware' },
    { code: '08 71 00', title: 'Door Hardware' },
    { code: '08 80 00', title: 'Glazing' },
  ],
  '09': [
    { code: '09 20 00', title: 'Plaster and Gypsum Board' },
    { code: '09 21 00', title: 'Plaster and Gypsum Board Assemblies' },
    { code: '09 22 00', title: 'Supports for Plaster and Gypsum Board' },
    { code: '09 30 00', title: 'Tiling' },
    { code: '09 50 00', title: 'Ceilings' },
    { code: '09 51 00', title: 'Acoustical Ceilings' },
    { code: '09 60 00', title: 'Flooring' },
    { code: '09 64 00', title: 'Wood Flooring' },
    { code: '09 65 00', title: 'Resilient Flooring' },
    { code: '09 66 00', title: 'Terrazzo Flooring' },
    { code: '09 68 00', title: 'Carpeting' },
    { code: '09 90 00', title: 'Painting and Coating' },
    { code: '09 91 00', title: 'Painting' },
  ],
  '10': [
    { code: '10 10 00', title: 'Information Specialties' },
    { code: '10 14 00', title: 'Signage' },
    { code: '10 20 00', title: 'Interior Specialties' },
    { code: '10 21 00', title: 'Compartments and Cubicles' },
    { code: '10 22 00', title: 'Partitions' },
    { code: '10 28 00', title: 'Toilet, Bath, and Laundry Accessories' },
    { code: '10 40 00', title: 'Safety Specialties' },
    { code: '10 44 00', title: 'Fire Protection Specialties' },
    { code: '10 50 00', title: 'Storage Specialties' },
    { code: '10 55 00', title: 'Postal Specialties' },
  ],
  '11': [
    { code: '11 10 00', title: 'Vehicle and Pedestrian Equipment' },
    { code: '11 20 00', title: 'Commercial Equipment' },
    { code: '11 30 00', title: 'Residential Equipment' },
    { code: '11 40 00', title: 'Foodservice Equipment' },
    { code: '11 50 00', title: 'Educational and Scientific Equipment' },
  ],
  '12': [
    { code: '12 20 00', title: 'Window Treatments' },
    { code: '12 30 00', title: 'Casework' },
    { code: '12 40 00', title: 'Furnishings and Accessories' },
    { code: '12 50 00', title: 'Furniture' },
    { code: '12 60 00', title: 'Multiple Seating' },
  ],
  '14': [
    { code: '14 20 00', title: 'Elevators' },
    { code: '14 21 00', title: 'Electric Traction Elevators' },
    { code: '14 24 00', title: 'Hydraulic Elevators' },
    { code: '14 30 00', title: 'Escalators and Moving Walks' },
  ],
  '21': [
    { code: '21 10 00', title: 'Water-Based Fire-Suppression Systems' },
    { code: '21 13 00', title: 'Fire-Suppression Sprinkler Systems' },
    { code: '21 20 00', title: 'Fire-Extinguishing Systems' },
    { code: '21 30 00', title: 'Fire Pumps' },
  ],
  '22': [
    { code: '22 10 00', title: 'Plumbing Piping and Pumps' },
    { code: '22 11 00', title: 'Facility Water Distribution' },
    { code: '22 13 00', title: 'Facility Sanitary Sewerage' },
    { code: '22 30 00', title: 'Plumbing Equipment' },
    { code: '22 40 00', title: 'Plumbing Fixtures' },
    { code: '22 42 00', title: 'Commercial Plumbing Fixtures' },
  ],
  '23': [
    { code: '23 05 00', title: 'Common Work Results for HVAC' },
    { code: '23 07 00', title: 'HVAC Insulation' },
    { code: '23 09 00', title: 'Instrumentation and Control for HVAC' },
    { code: '23 20 00', title: 'HVAC Piping and Pumps' },
    { code: '23 30 00', title: 'HVAC Air Distribution' },
    { code: '23 34 00', title: 'HVAC Fans' },
    { code: '23 37 00', title: 'Air Outlets and Inlets' },
    { code: '23 50 00', title: 'Central Heating Equipment' },
    { code: '23 60 00', title: 'Central Cooling Equipment' },
    { code: '23 70 00', title: 'Central HVAC Equipment' },
    { code: '23 73 00', title: 'Indoor Central-Station Air-Handling Units' },
    { code: '23 80 00', title: 'Decentralized HVAC Equipment' },
  ],
  '26': [
    { code: '26 05 00', title: 'Common Work Results for Electrical' },
    { code: '26 09 00', title: 'Instrumentation and Control for Electrical Systems' },
    { code: '26 10 00', title: 'Medium-Voltage Electrical Distribution' },
    { code: '26 20 00', title: 'Low-Voltage Electrical Transmission' },
    { code: '26 24 00', title: 'Switchboards and Panelboards' },
    { code: '26 27 00', title: 'Low-Voltage Distribution Equipment' },
    { code: '26 28 00', title: 'Low-Voltage Circuit Protective Devices' },
    { code: '26 29 00', title: 'Low-Voltage Controllers' },
    { code: '26 50 00', title: 'Lighting' },
    { code: '26 51 00', title: 'Interior Lighting' },
    { code: '26 56 00', title: 'Exterior Lighting' },
  ],
  '27': [
    { code: '27 10 00', title: 'Structured Cabling' },
    { code: '27 20 00', title: 'Data Communications' },
    { code: '27 30 00', title: 'Voice Communications' },
    { code: '27 40 00', title: 'Audio-Video Communications' },
    { code: '27 50 00', title: 'Distributed Communications and Monitoring Systems' },
  ],
  '28': [
    { code: '28 10 00', title: 'Electronic Access Control and Intrusion Detection' },
    { code: '28 20 00', title: 'Electronic Surveillance' },
    { code: '28 30 00', title: 'Electronic Detection and Alarm' },
    { code: '28 31 00', title: 'Fire Detection and Alarm' },
  ],
  '31': [
    { code: '31 10 00', title: 'Site Clearing' },
    { code: '31 20 00', title: 'Earth Moving' },
    { code: '31 23 00', title: 'Excavation and Fill' },
    { code: '31 30 00', title: 'Earthwork Methods' },
    { code: '31 40 00', title: 'Shoring and Underpinning' },
    { code: '31 50 00', title: 'Excavation Support and Protection' },
    { code: '31 60 00', title: 'Special Foundations and Load-Bearing Elements' },
    { code: '31 63 00', title: 'Bored Piles' },
  ],
  '32': [
    { code: '32 10 00', title: 'Bases, Ballasts, and Paving' },
    { code: '32 12 00', title: 'Flexible Paving' },
    { code: '32 13 00', title: 'Rigid Paving' },
    { code: '32 14 00', title: 'Unit Paving' },
    { code: '32 30 00', title: 'Site Improvements' },
    { code: '32 31 00', title: 'Fences and Gates' },
    { code: '32 80 00', title: 'Irrigation' },
    { code: '32 90 00', title: 'Planting' },
  ],
  '33': [
    { code: '33 10 00', title: 'Water Utilities' },
    { code: '33 30 00', title: 'Sanitary Sewerage Utilities' },
    { code: '33 40 00', title: 'Storm Drainage Utilities' },
    { code: '33 70 00', title: 'Electrical Utilities' },
    { code: '33 80 00', title: 'Communications Utilities' },
  ],
}

interface CSISpecPickerProps {
  value: string
  onChange: (specSection: string, title: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function CSISpecPicker({
  value,
  onChange,
  label = 'Spec Section',
  placeholder = 'Select or type spec section...',
  required = false,
  disabled = false,
  className = '',
}: CSISpecPickerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set())

  // Parse current value to get division
  const currentDivision = value ? value.substring(0, 2) : ''

  // Filter divisions and sections based on search
  const filteredResults = useMemo(() => {
    if (!searchTerm) {
      return { divisions: CSI_DIVISIONS, sections: {} as typeof CSI_SPEC_SECTIONS }
    }

    const term = searchTerm.toLowerCase()
    const matchingDivisions = CSI_DIVISIONS.filter(
      (d) =>
        d.code.includes(term) ||
        d.title.toLowerCase().includes(term)
    )

    const matchingSections: typeof CSI_SPEC_SECTIONS = {}
    Object.entries(CSI_SPEC_SECTIONS).forEach(([divCode, sections]) => {
      const matches = sections.filter(
        (s) =>
          s.code.toLowerCase().includes(term) ||
          s.title.toLowerCase().includes(term)
      )
      if (matches.length > 0) {
        matchingSections[divCode] = matches
        // Also include the division if not already in matchingDivisions
        if (!matchingDivisions.some((d) => d.code === divCode)) {
          const div = CSI_DIVISIONS.find((d) => d.code === divCode)
          if (div) {matchingDivisions.push(div)}
        }
      }
    })

    return { divisions: matchingDivisions, sections: matchingSections }
  }, [searchTerm])

  const toggleDivision = (code: string) => {
    const newExpanded = new Set(expandedDivisions)
    if (newExpanded.has(code)) {
      newExpanded.delete(code)
    } else {
      newExpanded.add(code)
    }
    setExpandedDivisions(newExpanded)
  }

  const handleSelectSection = (code: string, title: string) => {
    onChange(code, title)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleManualEntry = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setSearchTerm(input)
    // Allow manual entry of spec section
    if (/^\d{2}\s?\d{2}\s?\d{2}/.test(input)) {
      onChange(input, '')
    }
  }

  const displayValue = useMemo(() => {
    if (!value) {return ''}
    // Try to find the title for the current value
    const division = value.substring(0, 2)
    const sections = CSI_SPEC_SECTIONS[division]
    if (sections) {
      const section = sections.find((s) => s.code === value)
      if (section) {return `${section.code} - ${section.title}`}
    }
    return value
  }, [value])

  return (
    <div className={`relative ${className}`}>
      {label && (
        <Label className="block text-sm font-medium text-secondary mb-1">
          {label} {required && <span className="text-error">*</span>}
        </Label>
      )}

      <div className="relative">
        <Input
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={handleManualEntry}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {value && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                onChange('', '')
                setSearchTerm('')
              }}
            >
              <X className="h-4 w-4 text-disabled" />
            </Button>
          )}
          <Search className="h-4 w-4 text-disabled" />
        </div>
      </div>

      {isOpen && !disabled && (
        <>
          {/* Backdrop to close picker */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-20 mt-1 w-full max-h-80 overflow-auto bg-card border border-border rounded-lg shadow-lg">
            {filteredResults.divisions.length === 0 ? (
              <div className="p-4 text-sm text-muted text-center">
                No matching spec sections found
              </div>
            ) : (
              <div className="py-1">
                {filteredResults.divisions.map((division) => {
                  const sections =
                    searchTerm
                      ? filteredResults.sections[division.code] || CSI_SPEC_SECTIONS[division.code]
                      : CSI_SPEC_SECTIONS[division.code]
                  const isExpanded = expandedDivisions.has(division.code) || !!searchTerm

                  return (
                    <div key={division.code}>
                      {/* Division Header */}
                      <button
                        type="button"
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface ${
                          currentDivision === division.code ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => toggleDivision(division.code)}
                      >
                        {sections && sections.length > 0 ? (
                          isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-disabled flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-disabled flex-shrink-0" />
                          )
                        ) : (
                          <span className="w-4" />
                        )}
                        <span className="font-medium text-foreground">
                          Division {division.code}
                        </span>
                        <span className="text-sm text-muted truncate">
                          {division.title}
                        </span>
                      </button>

                      {/* Sections */}
                      {isExpanded && sections && sections.length > 0 && (
                        <div className="bg-surface border-l-2 border-blue-200 ml-6">
                          {sections.map((section) => (
                            <button
                              key={section.code}
                              type="button"
                              className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-info-light ${
                                value === section.code ? 'bg-info-light text-blue-900' : 'text-secondary'
                              }`}
                              onClick={() => handleSelectSection(section.code, section.title)}
                            >
                              <span className="font-mono text-xs bg-muted px-1 rounded">
                                {section.code}
                              </span>
                              <span className="truncate">{section.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Manual entry hint */}
            <div className="px-3 py-2 text-xs text-disabled border-t bg-surface">
              Type a spec section (e.g., "03 30 00") or search by name
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Helper function to get spec section title
export function getSpecSectionTitle(code: string): string {
  const division = code.substring(0, 2)
  const sections = CSI_SPEC_SECTIONS[division]
  if (sections) {
    const section = sections.find((s) => s.code === code)
    if (section) {return section.title}
  }
  // Try to get division title
  const div = CSI_DIVISIONS.find((d) => d.code === division)
  return div?.title || ''
}

// Helper function to get division title
export function getDivisionTitle(code: string): string {
  const div = CSI_DIVISIONS.find((d) => d.code === code)
  return div?.title || ''
}

export default CSISpecPicker
