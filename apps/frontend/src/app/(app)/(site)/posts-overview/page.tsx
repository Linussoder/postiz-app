export const dynamic = 'force-dynamic';
import { PostsOverviewComponent } from '@gitroom/frontend/components/posts-overview/posts-overview.component';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: `Postiz Posts`,
  description: '',
};
export default async function Index() {
  return <PostsOverviewComponent />;
}
