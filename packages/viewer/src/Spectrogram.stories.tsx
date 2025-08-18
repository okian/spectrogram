import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Spectrogram, DEFAULT_SPECTRO_META } from './index';
import { generateSineWaveFrames } from './demoData';

const meta: Meta<typeof Spectrogram> = {
  title: 'Spectrogram',
  component: Spectrogram,
};
export default meta;

type Story = StoryObj<typeof Spectrogram>;

export const Basic: Story = {
  render: () => (
    <Spectrogram
      onReady={(api) => {
        api.setMeta(DEFAULT_SPECTRO_META);
        api.pushFrames(generateSineWaveFrames(DEFAULT_SPECTRO_META, 5));
      }}
    />
  ),
};
