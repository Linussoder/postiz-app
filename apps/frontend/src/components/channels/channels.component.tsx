'use client';

import React, { useCallback } from 'react';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import {
  AddProviderButton,
} from '@gitroom/frontend/components/launches/add.provider.component';
import { SettingsModal } from '@gitroom/frontend/components/launches/settings.modal';
import { EditChannelModal } from '@gitroom/frontend/components/channels/edit.channel.modal';

export const ChannelsComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const modal = useModals();
  const { isLoading, data: integrations, mutate } = useIntegrationList();

  const disableChannel = useCallback(
    (id: string, disabled: boolean) => async () => {
      if (
        !(await deleteDialog(
          disabled
            ? 'Are you sure you want to enable this channel?'
            : 'Are you sure you want to disable this channel?',
          disabled ? 'Enable Channel' : 'Disable Channel'
        ))
      ) {
        return;
      }
      await fetch(`/integrations/${disabled ? 'enable' : 'disable'}`, {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
      toast.show(disabled ? 'Channel Enabled' : 'Channel Disabled', 'success');
      mutate();
    },
    [mutate]
  );

  const deleteChannel = useCallback(
    (id: string) => async () => {
      if (
        !(await deleteDialog(
          'Are you sure you want to delete this channel?',
          'Delete Channel'
        ))
      ) {
        return;
      }
      const response = await fetch('/integrations', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      });
      if (response.status === 406) {
        toast.show(
          'You have to delete all the posts associated with this channel before deleting it',
          'warning'
        );
        return;
      }
      toast.show('Channel Deleted', 'success');
      mutate();
    },
    [mutate]
  );

  const openSettings = useCallback(
    (integration: any) => () => {
      modal.openModal({
        classNames: {
          modal: 'w-[100%] max-w-[600px] bg-transparent text-textColor',
        },
        size: '100%',
        withCloseButton: false,
        closeOnEscape: true,
        closeOnClickOutside: true,
        children: (
          <SettingsModal
            integration={integration}
            onClose={() => {
              modal.closeAll();
              mutate();
            }}
          />
        ),
      });
    },
    [mutate]
  );

  const openEdit = useCallback(
    (integration: any) => (e: React.MouseEvent) => {
      e.stopPropagation();
      modal.openModal({
        classNames: {
          modal: 'w-[100%] max-w-[600px] bg-transparent text-textColor',
        },
        size: '100%',
        withCloseButton: false,
        closeOnEscape: true,
        closeOnClickOutside: true,
        children: (
          <EditChannelModal integration={integration} mutate={mutate} />
        ),
      });
    },
    [mutate]
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[20px] p-[20px]">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-[600]">{t('channels', 'Channels')}</h1>
        <AddProviderButton update={() => mutate()} />
      </div>
      <div className="flex flex-col gap-[10px]">
        {(!integrations || integrations.length === 0) && (
          <div className="text-center p-[40px] text-[16px] opacity-70">
            {t('no_channels_connected', 'No channels connected yet.')}
          </div>
        )}
        {(integrations || []).map((integration: any) => (
          <div
            key={integration.id}
            onClick={openEdit(integration)}
            className="flex items-center gap-[16px] p-[16px] rounded-[8px] bg-newBgColorInner cursor-pointer hover:bg-boxHover transition-all"
          >
            <ImageWithFallback
              fallbackSrc={`/icons/platforms/${integration.identifier}.png`}
              src={integration.picture || '/no-picture.jpg'}
              className="rounded-[8px]"
              alt={integration.identifier}
              width={40}
              height={40}
            />
            <div className="flex-1 flex flex-col">
              <div className="text-[16px] font-[500]">{integration.name}</div>
              <div className="text-[13px] opacity-60">
                {integration.identifier}
              </div>
            </div>
            <div
              className={
                integration.disabled
                  ? 'text-[13px] px-[10px] py-[4px] rounded-full bg-gray-500/30 text-gray-300'
                  : 'text-[13px] px-[10px] py-[4px] rounded-full bg-green-500/30 text-green-300'
              }
            >
              {integration.disabled
                ? t('disabled', 'Disabled')
                : t('enabled', 'Enabled')}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openSettings(integration)();
              }}
              className="text-[13px] px-[12px] py-[6px] rounded-[6px] bg-fifth hover:bg-boxHover"
            >
              {t('settings', 'Settings')}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                disableChannel(integration.id, integration.disabled)();
              }}
              className="text-[13px] px-[12px] py-[6px] rounded-[6px] bg-fifth hover:bg-boxHover"
            >
              {integration.disabled
                ? t('enable', 'Enable')
                : t('disable', 'Disable')}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteChannel(integration.id)();
              }}
              className="text-[13px] px-[12px] py-[6px] rounded-[6px] bg-red-500/30 hover:bg-red-500/50 text-red-200"
            >
              {t('disconnect', 'Koppla bort')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
