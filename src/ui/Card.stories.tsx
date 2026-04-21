import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card } from './Card'
import { Button } from './Button'
import { TextInput } from './TextInput'

const meta = {
  title: 'Design System/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    padding: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Internal padding size',
    },
    children: {
      control: false,
      description: 'Card content',
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

// Basic padding variants
export const SmallPadding: Story = {
  args: {
    padding: 'sm',
    children: (
      <div>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Card with Small Padding</h3>
        <p style={{ margin: 0 }}>This card has minimal internal spacing.</p>
      </div>
    ),
  },
}

export const MediumPadding: Story = {
  args: {
    padding: 'md',
    children: (
      <div>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Card with Medium Padding</h3>
        <p style={{ margin: 0 }}>This card has standard internal spacing.</p>
      </div>
    ),
  },
}

export const LargePadding: Story = {
  args: {
    padding: 'lg',
    children: (
      <div>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Card with Large Padding</h3>
        <p style={{ margin: 0 }}>This card has generous internal spacing.</p>
      </div>
    ),
  },
}

// Realistic examples
export const LoginForm: Story = {
  args: {
    padding: 'lg',
    children: (
      <div style={{ width: 300 }}>
        <h2 style={{ margin: 0, marginBottom: 16 }}>Login</h2>
        <TextInput label="Email" placeholder="you@example.com" required />
        <TextInput label="Password" type="password" required />
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button variant="primary">Sign In</Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      </div>
    ),
  },
}

export const ContentCard: Story = {
  args: {
    padding: 'md',
    children: (
      <div style={{ maxWidth: 400 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Design System Benefits</h3>
        <p style={{ margin: 0, marginBottom: 12, color: '#6b7280' }}>
          Using a constrained design system ensures consistency across your application
          and makes it easier for AI to generate valid UI code.
        </p>
        <Button variant="primary" size="sm">
          Learn More
        </Button>
      </div>
    ),
  },
}

export const EmptyCard: Story = {
  args: {
    padding: 'md',
    children: (
      <div style={{ width: 200, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
        Empty card
      </div>
    ),
  },
}



