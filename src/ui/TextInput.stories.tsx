import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import * as React from 'react'
import { TextInput } from './TextInput'

const meta = {
  title: 'Design System/TextInput',
  component: TextInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Input label text',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    required: {
      control: 'boolean',
      description: 'Whether the field is required',
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password'],
      description: 'Input type',
    },
    value: {
      control: 'text',
      description: 'Input value (controlled)',
    },
  },
  args: {
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ minWidth: 300 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextInput>

export default meta
type Story = StoryObj<typeof meta>

// Basic variants
export const Default: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter your username',
  },
}

export const Required: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    required: true,
  },
}

export const WithValue: Story = {
  args: {
    label: 'Name',
    value: 'John Doe',
  },
}

// Type variants
export const EmailInput: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'your.email@example.com',
    required: true,
  },
}

export const PasswordInput: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter a secure password',
    required: true,
  },
}

export const TextInput_: Story = {
  args: {
    label: 'Full Name',
    type: 'text',
    placeholder: 'John Doe',
  },
}

// Realistic examples
export const SearchField: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search components...',
  },
}

export const PhoneNumber: Story = {
  args: {
    label: 'Phone Number',
    type: 'text',
    placeholder: '(555) 123-4567',
  },
}

export const LongLabel: Story = {
  args: {
    label: 'What is your company\'s full legal business name?',
    placeholder: 'Acme Corporation Inc.',
    required: true,
  },
}

// Interactive example
export const Controlled: Story = {
  args: {
    label: 'Controlled Input',
    placeholder: 'Type something...',
    value: '',
    onChange: (value) => console.log('Value changed:', value),
  },
  render: function Render(args) {
    const [value, setValue] = React.useState(args.value || '')
    
    return (
      <TextInput
        {...args}
        value={value}
        onChange={(newValue) => {
          setValue(newValue)
          args.onChange?.(newValue)
        }}
      />
    )
  },
}

