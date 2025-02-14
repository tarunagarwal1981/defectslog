// src/config/fieldMappings.js

export const CORE_FIELDS = {
    // Dialog Fields
    DIALOG: {
      vessel: {
        id: 'vessel',
        label: 'Vessel',
        dbField: 'vessel_id',
        type: 'select',
        required: true,
        section: 'basic',
        displayOrder: 1,
        width: 'full', // w-full
      },
      equipment: {
        id: 'equipment',
        label: 'Equipment',
        dbField: 'Equipments',
        type: 'select',
        required: true,
        section: 'basic',
        displayOrder: 2,
        width: 'full',
        options: [
          "Air System and Air Compressor",
          "Airconditioning & Refrigeration System",
          "Cargo and Ballast System",
          "Deck Crane and Grab",
          "BWTS",
          "Aux Engine",
          "Main Engine",
          "LO System",
          "FO System",
          "FW and SW System",
          "Load line Item",
          "SOLAS",
          "MARPOL",
          "Navigation and Radio Equipment",
          "Anchor and Mooring",
          "Steam System",
          "Steering Gear and Rudder",
          "Others"
        ]
      },

      silentMode: {
        id: 'silentMode',
        label: 'Silent Mode',
        dbField: 'external_visibility',
        type: 'checkbox',
        required: false,
        section: 'basic',
        displayOrder: 3,
        width: 'full',
        defaultValue: true,
      },
      description: {
        id: 'description',
        label: 'Description',
        dbField: 'Description',
        type: 'textarea',
        required: true,
        section: 'basic',
        displayOrder: 3,
        width: 'full',
        rows: 3
      },
      actionPlanned: {
        id: 'actionPlanned',
        label: 'Action Planned',
        dbField: 'Action Planned',
        type: 'textarea',
        required: true,
        section: 'basic',
        displayOrder: 4,
        width: 'full',
        rows: 3
      },
      comments: {
        id: 'comments',
        label: 'Follow-Up',
        dbField: 'Comments',
        type: 'textarea',
        required: false,
        section: 'basic',
        displayOrder: 5,
        width: 'full',
        rows: 3
      },
      status: {
        id: 'status',
        label: 'Status',
        dbField: 'Status (Vessel)',
        type: 'select',
        required: true,
        section: 'details',
        displayOrder: 6,
        width: 'full',
        options: ["OPEN", "IN PROGRESS", "CLOSED"]
      },
      criticality: {
        id: 'criticality',
        label: 'Criticality',
        dbField: 'Criticality',
        type: 'select',
        required: true,
        section: 'details',
        displayOrder: 7,
        width: 'full',
        options: ["High", "Medium", "Low"]
      },
      raisedBy: {
        id: 'raisedBy',
        label: 'Defect Source',
        dbField: 'raised_by',
        type: 'select',
        required: true,
        section: 'details',
        displayOrder: 8,
        width: 'full',
        options: [
          "Vessel",
          "Office",
          "Internal Audit",
          "VIR",
          "Owners",
          "PSC",
          "CLASS",
          "FLAG",
          "Guarantee Claim",
          "Dry Dock",
          "Others"
        ]
      },
      dateReported: {
        id: 'dateReported',
        label: 'Date Reported',
        dbField: 'Date Reported',
        type: 'date',
        required: true,
        section: 'dates',
        displayOrder: 9,
        width: 'half'
      },
      dateCompleted: {
        id: 'dateCompleted',
        label: 'Date Completed',
        dbField: 'Date Completed',
        type: 'date',
        required: false,
        section: 'dates',
        displayOrder: 10,
        width: 'half',
        conditionalRequired: (values) => values.status === 'CLOSED'
      },
      closureComments: {
        id: 'closureComments',
        label: 'Closure Comments',
        dbField: 'closure_comments',
        type: 'textarea',
        required: false,
        section: 'closure',
        displayOrder: 11,
        width: 'full',
        rows: 3,
        conditionalDisplay: (values) => values?.status === 'CLOSED' || values?.['Status (Vessel)'] === 'CLOSED',
        conditionalRequired: (values) => values?.status === 'CLOSED' || values?.['Status (Vessel)'] === 'CLOSED'
      },
      initialFiles: {
        id: 'initialFiles',
        label: 'Initial Documentation',
        dbField: 'initial_files',
        type: 'file',
        required: false,
        section: 'files',
        displayOrder: 12,
        width: 'full',
        accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
        maxSize: 2 * 1024 * 1024, // 2MB
        multiple: true
      },
      completionFiles: {
        id: 'completionFiles',
        label: 'Closure Documentation',
        dbField: 'completion_files',
        type: 'file',
        required: false,
        section: 'files',
        displayOrder: 13,
        width: 'full',
        accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
        maxSize: 2 * 1024 * 1024, // 2MB
        multiple: true,
        conditionalDisplay: (values) => values.status === 'CLOSED'
      }
    },
  
    // Table Fields
    TABLE: {
      expandToggle: {
        id: 'expandToggle',
        label: '',
        width: '40px',
        minWidth: '40px',
        priority: 1,
        isAction: true
      },
      index: {
        id: 'index',
        label: '#',
        width: '60px',
        minWidth: '60px',
        priority: 1
      },
      vessel: {
        id: 'vessel',
        label: 'Vessel',
        dbField: 'vessel_name',
        width: '150px',
        minWidth: '150px',
        priority: 1
      },
      status: {
        id: 'status',
        label: 'Status',
        dbField: 'Status (Vessel)',
        width: '120px',
        minWidth: '120px',
        priority: 1
      },
      criticality: {
        id: 'criticality',
        label: 'Criticality',
        dbField: 'Criticality',
        width: '120px',
        minWidth: '120px',
        priority: 1
      },
      equipment: {
        id: 'equipment',
        label: 'Equipment',
        dbField: 'Equipments',
        width: '150px',
        minWidth: '150px',
        priority: 2
      },
      description: {
        id: 'description',
        label: 'Description',
        dbField: 'Description',
        width: '200px',
        minWidth: '200px',
        priority: 2
      },
      actionPlanned: {
        id: 'actionPlanned',
        label: 'Action Planned',
        dbField: 'Action Planned',
        width: '200px',
        minWidth: '200px',
        priority: 2
      },
      dateReported: {
        id: 'dateReported',
        label: 'Reported',
        dbField: 'Date Reported',
        width: '120px',
        minWidth: '120px',
        priority: 3,
        type: 'date'
      },
      dateCompleted: {
        id: 'dateCompleted',
        label: 'Completed',
        dbField: 'Date Completed',
        width: '120px',
        minWidth: '120px',
        priority: 3,
        type: 'date'
      },
      actions: {
        id: 'actions',
        label: 'Actions',
        width: '80px',
        minWidth: '80px',
        priority: 99,
        isAction: true,
        fixedRight: true
      }
    },
  
    // Expanded View Fields (Additional fields shown in expanded row)
    EXPANDED: {
      description: {
        id: 'description',
        label: 'Description',
        dbField: 'Description',
        section: 'details'
      },
      actionPlanned: {
        id: 'actionPlanned',
        label: 'Action Planned',
        dbField: 'Action Planned',
        section: 'details'
      },
      comments: {
        id: 'comments',
        label: 'Follow-Up',
        dbField: 'Comments',
        section: 'details'
      },
      initialFiles: {
        id: 'initialFiles',
        label: 'Initial Documentation',
        dbField: 'initial_files',
        section: 'files'
      },
      closureComments: {
        id: 'closureComments',
        label: 'Closure Comments',
        dbField: 'closure_comments',
        section: 'closure',
        conditionalDisplay: (values) => values.status === 'CLOSED'
      },
      completionFiles: {
        id: 'completionFiles',
        label: 'Closure Documentation',
        dbField: 'completion_files',
        section: 'files',
        conditionalDisplay: (values) => values.status === 'CLOSED'
      },
      raisedBy: {
        id: 'raisedBy',
        label: 'Defect Source',
        dbField: 'raised_by',
        section: 'metadata'
      },
      'silentMode': {
        type: 'checkbox',
        label: 'Silent Mode (Hide from external users)',
        dbField: 'external_visibility',
        displayOrder: 25,
        defaultValue: true
      }
    }
  };
  
  export const FIELD_SECTIONS = {
    basic: {
      id: 'basic',
      label: 'Basic Information',
      order: 1
    },
    details: {
      id: 'details',
      label: 'Details',
      order: 2
    },
    dates: {
      id: 'dates',
      label: 'Dates',
      order: 3
    },
    closure: {
      id: 'closure',
      label: 'Closure Details',
      order: 4,
      conditionalDisplay: (values) => values.status === 'CLOSED'
    },
    files: {
      id: 'files',
      label: 'Documentation',
      order: 5
    }
  };
  
