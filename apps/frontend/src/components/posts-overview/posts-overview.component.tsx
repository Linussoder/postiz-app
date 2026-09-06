'use client';

import React, { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { DatePicker } from '@gitroom/frontend/components/launches/helpers/date.picker';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { MailComposerModal } from '@gitroom/frontend/components/posts-overview/mail.composer.modal';

dayjs.extend(utc);

const stripHtml = (html: string) => {
  if (!html) return '';
  return html
    .replace(/<\/(p|div|br|li)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

type TabKey = 'scheduled' | 'published' | 'drafts' | 'ai' | 'mail';
type MailSegment = 'sent' | 'draft' | 'schedule';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'scheduled', label: 'Schemalagda' },
  { key: 'published', label: 'Publicerade' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'ai', label: 'AI-genererade' },
  { key: 'mail', label: 'Mail' },
];

const MAIL_SEGMENTS: { key: MailSegment; label: string }[] = [
  { key: 'sent', label: 'Sent' },
  { key: 'draft', label: 'Draft' },
  { key: 'schedule', label: 'Schedule' },
];

const badgeClasses: Record<string, string> = {
  green: 'bg-green-500/30 text-green-300',
  yellow: 'bg-yellow-500/30 text-yellow-200',
  gray: 'bg-gray-500/30 text-gray-300',
  red: 'bg-red-500/30 text-red-200',
};

const stateBadge = (post: { state: string; error?: string | null }) => {
  if (post.error) {
    return { color: 'red', label: 'Misslyckad' };
  }
  switch (post.state) {
    case 'PUBLISHED':
      return { color: 'green', label: 'Publicerad' };
    case 'QUEUE':
      return { color: 'yellow', label: 'Schemalagd' };
    case 'DRAFT':
      return { color: 'gray', label: 'Draft' };
    default:
      return { color: 'gray', label: post.state };
  }
};

export const PostsOverviewComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toast = useToaster();
  const { data: integrations } = useIntegrationList();

  const [tab, setTab] = useState<TabKey>('scheduled');
  const [mailSegment, setMailSegment] = useState<MailSegment>('sent');
  const [channel, setChannel] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selected, setSelected] = useState<string[]>([]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set('tab', tab);
    if (channel) p.set('channel', channel);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (search) p.set('search', search);
    if (tab === 'mail') p.set('mailSegment', mailSegment);
    return p.toString();
  }, [tab, channel, from, to, search, mailSegment]);

  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);

  const { data, isLoading, mutate } = useSWR(
    `/posts/overview?${params}`,
    load,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const posts: any[] = data?.posts || [];
  const fbQueue: any[] = data?.facebookGroupQueue || [];
  const mail = data?.mail;

  const changeTab = useCallback(
    (key: TabKey) => () => {
      setTab(key);
      setSelected([]);
    },
    []
  );

  const toggleSelected = useCallback(
    (id: string) => () => {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
      );
    },
    []
  );

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => (prev.length === posts.length ? [] : posts.map((p) => p.id)));
  }, [posts]);

  const openComposer = useCallback(
    (post: any) => async () => {
      const dataRes = await (await fetch(`/posts/${post.id}`)).json();
      const publishDate = dayjs.utc(dataRes.posts[0].publishDate).local();
      const allIntegrations = (integrations || []).map((p: any) => ({ ...p }));

      modal.openModal({
        id: 'add-edit-modal',
        closeOnClickOutside: false,
        removeLayout: true,
        closeOnEscape: false,
        withCloseButton: false,
        askClose: true,
        classNames: {
          modal: 'w-[100%] max-w-[1400px] text-textColor',
        },
        children: (
          <ExistingDataContextProvider value={dataRes}>
            <AddEditModal
              allIntegrations={allIntegrations}
              reopenModal={() => ({})}
              mutate={mutate}
              integrations={allIntegrations
                .filter((f: any) => f.id === dataRes.integration)
                .map((p: any) => ({
                  ...p,
                  picture: dataRes.integrationPicture,
                }))}
              date={publishDate}
            />
          </ExistingDataContextProvider>
        ),
        size: '80%',
        title: ``,
      });
    },
    [integrations, mutate]
  );

  const createNewPost = useCallback(async () => {
    const date = (await (await fetch('/posts/find-slot')).json()).date;
    const allIntegrations = (integrations || []).map((p: any) => ({ ...p }));

    modal.openModal({
      closeOnClickOutside: false,
      closeOnEscape: false,
      withCloseButton: false,
      removeLayout: true,
      askClose: true,
      classNames: {
        modal: 'w-[100%] max-w-[1400px] bg-transparent text-textColor',
      },
      id: 'add-edit-modal',
      children: (
        <AddEditModal
          allIntegrations={allIntegrations}
          reopenModal={createNewPost}
          mutate={mutate}
          integrations={allIntegrations}
          date={dayjs.utc(date).local()}
        />
      ),
      size: '80%',
      title: ``,
    });
  }, [integrations, mutate]);

  const bulkDelete = useCallback(async () => {
    if (!selected.length) return;
    const groups = posts
      .filter((p) => selected.includes(p.id))
      .map((p) => p.group);
    for (const group of groups) {
      await fetch(`/posts/${group}`, { method: 'DELETE' });
    }
    toast.show('Valda inlägg raderade', 'success');
    setSelected([]);
    mutate();
  }, [selected, posts, mutate]);

  const openMailComposer = useCallback(
    (existingCampaign?: any) => () => {
      modal.openModal({
        title: '',
        withCloseButton: false,
        closeOnClickOutside: true,
        classNames: { modal: 'bg-transparent' },
        children: (
          <MailComposerModal
            existing={
              existingCampaign
                ? {
                    id: existingCampaign.id,
                    subject: existingCampaign.subject,
                    sendAt: existingCampaign.sendAt,
                    status: existingCampaign.status,
                  }
                : undefined
            }
            onClose={() => modal.closeAll()}
            onSaved={() => mutate()}
          />
        ),
      });
    },
    [mutate]
  );

  const bulkReschedule = useCallback(() => {
    if (!selected.length) return;
    let newDate = newDayjs();
    modal.openModal({
      title: 'Omschemalägg valda',
      withCloseButton: true,
      children: (
        <div className="flex flex-col gap-[16px]">
          <DatePicker
            date={newDate}
            onChange={(d: dayjs.Dayjs) => (newDate = d)}
          />
          <Button
            onClick={async () => {
              for (const id of selected) {
                await fetch(`/posts/${id}/date`, {
                  method: 'PUT',
                  body: JSON.stringify({
                    date: newDate.utc().format('YYYY-MM-DDTHH:mm:00'),
                  }),
                });
              }
              toast.show('Valda inlägg omschemalagda', 'success');
              modal.closeAll();
              setSelected([]);
              mutate();
            }}
          >
            Bekräfta
          </Button>
        </div>
      ),
    });
  }, [selected, mutate]);

  const repost = useCallback(
    (post: any) => () => {
      let newDate = newDayjs().add(1, 'hour');
      modal.openModal({
        title: 'Repost - välj ny tid',
        withCloseButton: true,
        children: (
          <div className="flex flex-col gap-[16px]">
            <DatePicker
              date={newDate}
              onChange={(d: dayjs.Dayjs) => (newDate = d)}
            />
            <Button
              onClick={async () => {
                const settings = post.settings
                  ? JSON.parse(post.settings)
                  : { __type: post.integration?.providerIdentifier };
                await fetch('/posts', {
                  method: 'POST',
                  body: JSON.stringify({
                    type: 'schedule',
                    date: newDate.utc().format('YYYY-MM-DDTHH:mm:00'),
                    shortLink: false,
                    tags: [],
                    posts: [
                      {
                        integration: { id: post.integration.id },
                        value: [
                          {
                            content: post.content,
                            image: post.image ? JSON.parse(post.image) : [],
                          },
                        ],
                        settings,
                      },
                    ],
                  }),
                });
                toast.show('Repost skapad', 'success');
                modal.closeAll();
                mutate();
              }}
            >
              Repost
            </Button>
          </div>
        ),
      });
    },
    [mutate]
  );

  const renderFilters = () => (
    <div className="flex flex-wrap items-center gap-[10px] mb-[16px]">
      <select
        className="bg-newBgColorInner rounded-[6px] px-[10px] py-[8px] text-[14px]"
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
      >
        <option value="">{t('all_channels', 'Alla kanaler')}</option>
        {(integrations || []).map((i: any) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        className="bg-newBgColorInner rounded-[6px] px-[10px] py-[8px] text-[14px]"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />
      <input
        type="date"
        className="bg-newBgColorInner rounded-[6px] px-[10px] py-[8px] text-[14px]"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <input
        type="text"
        placeholder={t('search_content', 'Sök i innehåll')}
        className="bg-newBgColorInner rounded-[6px] px-[10px] py-[8px] text-[14px] flex-1 min-w-[200px]"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );

  const renderBulkActions = () => (
    <div className="flex items-center gap-[10px] mb-[10px]">
      <input
        type="checkbox"
        checked={!!posts.length && selected.length === posts.length}
        onChange={toggleSelectAll}
      />
      <span className="text-[13px] opacity-70">
        {selected.length} valda
      </span>
      <button
        type="button"
        disabled={!selected.length}
        onClick={bulkDelete}
        className="text-[13px] px-[10px] py-[6px] rounded-[6px] bg-red-500/30 hover:bg-red-500/50 text-red-200 disabled:opacity-30"
      >
        Radera valda
      </button>
      <button
        type="button"
        disabled={!selected.length}
        onClick={bulkReschedule}
        className="text-[13px] px-[10px] py-[6px] rounded-[6px] bg-fifth hover:bg-boxHover disabled:opacity-30"
      >
        Omschemalägg valda
      </button>
    </div>
  );

  const renderPostRow = (post: any) => {
    const badge = stateBadge(post);
    return (
      <div
        key={post.id}
        className="flex items-center gap-[12px] p-[12px] rounded-[8px] bg-newBgColorInner hover:bg-boxHover transition-all"
      >
        <input
          type="checkbox"
          checked={selected.includes(post.id)}
          onChange={toggleSelected(post.id)}
          onClick={(e) => e.stopPropagation()}
        />
        <div
          className="flex-1 flex items-center gap-[12px] cursor-pointer"
          onClick={openComposer(post)}
        >
          <img
            src={post.integration?.picture || '/no-picture.jpg'}
            className="w-[32px] h-[32px] rounded-full"
          />
          <div className="flex flex-col flex-1 min-w-0">
            <div className="text-[14px] truncate max-w-[500px]">
              {stripHtml(post.content)}
            </div>
            <div className="text-[12px] opacity-60">
              {post.integration?.name} •{' '}
              {dayjs(post.publishDate).format('YYYY-MM-DD HH:mm')}
            </div>
          </div>
          <div
            className={clsx(
              'text-[12px] px-[10px] py-[4px] rounded-full whitespace-nowrap',
              badgeClasses[badge.color]
            )}
          >
            {badge.label}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            repost(post)();
          }}
          className="text-[13px] px-[10px] py-[6px] rounded-[6px] bg-fifth hover:bg-boxHover whitespace-nowrap"
        >
          Repost
        </button>
      </div>
    );
  };

  const renderFbGroupRow = (row: any) => (
    <div
      key={row.id}
      className="flex items-center gap-[12px] p-[12px] rounded-[8px] bg-newBgColorInner opacity-90"
    >
      <div className="w-[16px]" />
      <div className="flex-1 flex items-center gap-[12px]">
        <div className="w-[32px] h-[32px] rounded-full bg-fifth flex items-center justify-center text-[12px]">
          FB
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="text-[14px] truncate max-w-[500px]">{stripHtml(row.text)}</div>
          <div className="text-[12px] opacity-60">
            {row.channelLabel} •{' '}
            {dayjs(row.scheduledAt).format('YYYY-MM-DD HH:mm')}
          </div>
        </div>
        <div
          className={clsx(
            'text-[12px] px-[10px] py-[4px] rounded-full whitespace-nowrap',
            badgeClasses[row.badge]
          )}
        >
          {row.status}
        </div>
      </div>
    </div>
  );

  const renderMailTab = () => (
    <div className="flex flex-col gap-[16px]">
      <div className="flex gap-[10px]">
        {MAIL_SEGMENTS.map((seg) => (
          <button
            key={seg.key}
            type="button"
            onClick={() => setMailSegment(seg.key)}
            className={clsx(
              'px-[14px] py-[8px] rounded-[6px] text-[14px]',
              mailSegment === seg.key
                ? 'bg-btnSimple text-btnText'
                : 'bg-newBgColorInner'
            )}
          >
            {seg.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-[8px]">
        {(!mail || !mail[mailSegment] || mail[mailSegment].length === 0) && (
          <div className="text-center p-[40px] opacity-60">
            {t('no_mail_campaigns', 'Inga kampanjer i denna kategori.')}
          </div>
        )}
        {(mail?.[mailSegment] || []).map((campaign: any) => (
          <div
            key={campaign.id}
            onClick={openMailComposer(campaign)}
            className="flex items-center gap-[12px] p-[12px] rounded-[8px] bg-newBgColorInner cursor-pointer hover:opacity-80"
          >
            <div className="flex-1 flex flex-col">
              <div className="text-[14px]">{campaign.name}</div>
              <div className="text-[12px] opacity-60">{campaign.subject}</div>
            </div>
            <div className="text-[12px] opacity-60">
              {campaign.sendAt
                ? dayjs(campaign.sendAt).format('YYYY-MM-DD HH:mm')
                : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );


  return (
    <div className="flex flex-col gap-[16px] p-[20px]">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-[600]">{t('posts', 'Posts')}</h1>
        <button
          onClick={tab === 'mail' ? openMailComposer() : createNewPost}
          className="text-btnText bg-btnSimple h-[44px] pt-[12px] pb-[14px] ps-[16px] pe-[20px] justify-center items-center flex rounded-[8px] gap-[8px]"
        >
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
            >
              <path
                d="M10.5001 4.16699V15.8337M4.66675 10.0003H16.3334"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-start text-[16px]">
            {tab === 'mail'
              ? t('create_mail', 'Create mail')
              : t('create_post', 'Create post')}
          </div>
        </button>
      </div>
      <div className="flex gap-[8px] border-b border-customColor6 pb-[8px]">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={changeTab(tabItem.key)}
            className={clsx(
              'px-[16px] py-[8px] rounded-t-[6px] text-[14px]',
              tab === tabItem.key
                ? 'bg-btnSimple text-btnText'
                : 'bg-newBgColorInner opacity-70'
            )}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'mail' ? (
        renderMailTab()
      ) : (
        <>
          {renderFilters()}
          {isLoading ? (
            <LoadingComponent />
          ) : (
            <>
              {renderBulkActions()}
              <div className="flex flex-col gap-[8px]">
                {posts.length === 0 && fbQueue.length === 0 && (
                  <div className="text-center p-[40px] opacity-60">
                    {t('no_posts_found', 'Inga inlägg hittades.')}
                  </div>
                )}
                {posts.map(renderPostRow)}
                {fbQueue.map(renderFbGroupRow)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
