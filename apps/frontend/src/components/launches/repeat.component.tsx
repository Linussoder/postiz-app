import { FC, useState } from 'react';
import { Select } from '@gitroom/react/form/select';
import { Input } from '@gitroom/react/form/input';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
const list = [
  {
    value: 1,
    label: 'Every Day',
  },
  {
    value: 2,
    label: 'Every Two Days',
  },
  {
    value: 3,
    label: 'Every Three Days',
  },
  {
    value: 4,
    label: 'Every Four Days',
  },
  {
    value: 5,
    label: 'Every Five Days',
  },
  {
    value: 6,
    label: 'Every Six Days',
  },
  {
    value: 7,
    label: 'Every Week',
  },
  {
    value: 14,
    label: 'Every Two Weeks',
  },
  {
    value: 30,
    label: 'Every Month',
  },
];
const CUSTOM_VALUE = -1;

export const RepeatComponent: FC<{
  repeat: number | null;
  onChange: (newVal: number) => void;
}> = (props) => {
  const { repeat } = props;
  const t = useT();
  const isPreset = !repeat || list.some((item) => item.value === repeat);
  const [showCustom, setShowCustom] = useState(!isPreset);
  const [customDays, setCustomDays] = useState<number | ''>(
    !isPreset && repeat ? repeat : ''
  );

  return (
    <div className="flex items-center gap-[8px]">
      <Select
        disableForm={true}
        label=""
        hideErrors={true}
        name="repeat"
        value={showCustom ? CUSTOM_VALUE : repeat ? repeat : undefined}
        onChange={(e) => {
          const val = Number(e.target.value);
          if (val === CUSTOM_VALUE) {
            setShowCustom(true);
            if (customDays) {
              props.onChange(Number(customDays));
            }
            return;
          }
          setShowCustom(false);
          props.onChange(val);
        }}
      >
        <option>{t('repeat_post_every', 'Repeat Post Every...')}</option>
        {list.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
        <option value={CUSTOM_VALUE}>
          {t('custom_days', 'Custom (days)...')}
        </option>
      </Select>
      {showCustom && (
        <Input
          disableForm={true}
          label=""
          removeError={true}
          name="customRepeatDays"
          type="number"
          placeholder={t('days', 'Days')}
          value={customDays}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : '';
            setCustomDays(val);
            if (val && Number(val) > 0) {
              props.onChange(Number(val));
            }
          }}
        />
      )}
    </div>
  );
};
