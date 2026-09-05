'use client';

import React, { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import dayjs from 'dayjs';

interface MailList {
  id: number;
  name: string;
  subscriberCount: number;
}

export const MailComposerModal: FC<{
  onClose: () => void;
  onSaved: () => void;
  existing?: {
    id: number;
    subject: string;
    body?: string;
    sendAt?: string | null;
    listIds?: number[];
    status?: string;
  };
}> = (props) => {
  const { onClose, onSaved, existing } = props;
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();

  const [lists, setLists] = useState<MailList[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [subject, setSubject] = useState(existing?.subject || '');
  const [body, setBody] = useState(existing?.body || '');
  const [listId, setListId] = useState<string>(
    existing?.listIds?.[0]?.toString() || ''
  );
  const [scheduleMode, setScheduleMode] = useState<'now' | 'draft' | 'schedule'>(
    existing?.status === 'scheduled'
      ? 'schedule'
      : existing?.status === 'finished' || existing?.status === 'running'
      ? 'now'
      : 'draft'
  );
  const [sendAt, setSendAt] = useState<string>(
    existing?.sendAt
      ? dayjs(existing.sendAt).format('YYYY-MM-DDTHH:mm')
      : dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm')
  );
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!existing?.id);

  React.useEffect(() => {
    if (!existing?.id) return;
    (async () => {
      try {
        const full = await (await fetch(`/posts/mail/${existing.id}`)).json();
        setSubject(full.subject || '');
        setBody(full.body || '');
        setListId(full.listIds?.[0]?.toString() || '');
        if (full.sendAt) {
          setSendAt(dayjs(full.sendAt).format('YYYY-MM-DDTHH:mm'));
        }
        setScheduleMode(
          full.status === 'scheduled'
            ? 'schedule'
            : full.status === 'finished' || full.status === 'running'
            ? 'now'
            : 'draft'
        );
      } catch (e) {
        toast.show('Kunde inte ladda mailet', 'warning');
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [existing?.id]);

  const loadLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const res = await (await fetch('/posts/mail/lists')).json();
      setLists(res || []);
    } catch (e) {
      toast.show('Kunde inte ladda mottagarlistor', 'warning');
    } finally {
      setLoadingLists(false);
    }
  }, []);

  React.useEffect(() => {
    loadLists();
  }, [loadLists]);

  const save = useCallback(async () => {
    if (!subject.trim()) {
      toast.show('Ämne krävs', 'warning');
      return;
    }
    if (!body.trim()) {
      toast.show('Meddelande krävs', 'warning');
      return;
    }
    if (!listId) {
      toast.show('Välj en mottagarlista', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        subject,
        body,
        listIds: [+listId],
      };

      if (scheduleMode === 'now') {
        payload.sendNow = true;
      } else if (scheduleMode === 'schedule') {
        payload.sendAt = dayjs(sendAt).toISOString();
      }
      // draft: neither sendNow nor sendAt set

      if (existing?.id) {
        await fetch(`/posts/mail/${existing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (scheduleMode === 'now') {
          await fetch(`/posts/mail/${existing.id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'sent' }),
          });
        } else if (scheduleMode === 'schedule') {
          await fetch(`/posts/mail/${existing.id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'scheduled' }),
          });
        } else {
          await fetch(`/posts/mail/${existing.id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'draft' }),
          });
        }
      } else {
        await fetch('/posts/mail', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      toast.show('Mail sparat', 'success');
      onSaved();
      onClose();
    } catch (e) {
      toast.show('Kunde inte spara mailet', 'warning');
    } finally {
      setSaving(false);
    }
  }, [subject, body, listId, scheduleMode, sendAt, existing]);

  return (
    <div className="flex flex-col gap-[16px] p-[24px] bg-newBgColorInner rounded-[8px] w-[600px] max-w-[90vw]">
      <div className="text-[20px] font-[600]">
        {existing ? t('edit_mail', 'Redigera mail') : t('new_mail', 'Nytt mail')}
      </div>

      <div className="flex flex-col gap-[4px]">
        <label className="text-[13px] opacity-70">{t('subject', 'Ämne')}</label>
        <Input
          disableForm={true}
          label=""
          removeError={true}
          name="mailSubject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('subject_placeholder', 'Skriv ämnesraden...')}
        />
      </div>

      <div className="flex flex-col gap-[4px]">
        <label className="text-[13px] opacity-70">
          {t('message_plain_text', 'Meddelande (ren text)')}
        </label>
        <textarea
          className="bg-newBgColorInner border border-newTableBorder rounded-[8px] p-[12px] text-[14px] text-textColor min-h-[220px] outline-none"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t(
            'message_placeholder',
            'Skriv ditt meddelande i ren text, ingen HTML...'
          )}
        />
      </div>

      <div className="flex flex-col gap-[4px]">
        <label className="text-[13px] opacity-70">
          {t('recipients', 'Mottagare (lista)')}
        </label>
        <Select
          disableForm={true}
          label=""
          hideErrors={true}
          name="mailList"
          value={listId}
          onChange={(e) => setListId(e.target.value)}
        >
          <option value="">
            {loadingLists
              ? t('loading', 'Laddar...')
              : t('select_list', 'Välj lista...')}
          </option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.subscriberCount} st)
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-[8px]">
        <label className="text-[13px] opacity-70">
          {t('when_to_send', 'Skicka')}
        </label>
        <div className="flex gap-[8px]">
          <button
            type="button"
            onClick={() => setScheduleMode('draft')}
            className={`px-[14px] py-[8px] rounded-[6px] text-[14px] ${
              scheduleMode === 'draft'
                ? 'bg-btnSimple text-btnText'
                : 'bg-newBgColorInner border border-newTableBorder'
            }`}
          >
            {t('save_as_draft', 'Spara som draft')}
          </button>
          <button
            type="button"
            onClick={() => setScheduleMode('schedule')}
            className={`px-[14px] py-[8px] rounded-[6px] text-[14px] ${
              scheduleMode === 'schedule'
                ? 'bg-btnSimple text-btnText'
                : 'bg-newBgColorInner border border-newTableBorder'
            }`}
          >
            {t('schedule', 'Schemalägg')}
          </button>
          <button
            type="button"
            onClick={() => setScheduleMode('now')}
            className={`px-[14px] py-[8px] rounded-[6px] text-[14px] ${
              scheduleMode === 'now'
                ? 'bg-btnSimple text-btnText'
                : 'bg-newBgColorInner border border-newTableBorder'
            }`}
          >
            {t('send_now', 'Skicka nu')}
          </button>
        </div>
        {scheduleMode === 'schedule' && (
          <input
            type="datetime-local"
            className="bg-newBgColorInner border border-newTableBorder rounded-[8px] p-[10px] text-[14px] text-textColor outline-none"
            value={sendAt}
            onChange={(e) => setSendAt(e.target.value)}
          />
        )}
      </div>

      <div className="flex justify-end gap-[8px] mt-[8px]">
        <Button onClick={onClose} className="bg-newBgColorInner">
          {t('cancel', 'Avbryt')}
        </Button>
        <Button onClick={save} loading={saving} disabled={loadingExisting}>
          {t('save', 'Spara')}
        </Button>
      </div>
    </div>
  );
};
