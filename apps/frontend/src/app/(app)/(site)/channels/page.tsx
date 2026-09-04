export const dynamic = 'force-dynamic';
import { ChannelsComponent } from '@gitroom/frontend/components/channels/channels.component';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: `Postiz Channels`,
  description: '',
};
export default async function Index() {
  return <ChannelsComponent />;
}
