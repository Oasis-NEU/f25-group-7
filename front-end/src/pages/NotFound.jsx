import { Compass } from 'lucide-react';
import { ButtonLink } from '../ui/Button';
import { EmptyState } from '../ui/primitives';
import { usePageTitle } from '../lib/usePageTitle';

export const NotFound = () => {
  usePageTitle('Page not found');
  return (
  <EmptyState
    icon={Compass}
    title="We couldn't find that page"
    action={(
      <>
        <ButtonLink to="/home">Today's menus</ButtonLink>
        <ButtonLink to="/hours" variant="secondary">Dining hall hours</ButtonLink>
      </>
    )}
  >
    The link may be out of date, or the page may have moved.
  </EmptyState>
  );
};

export default NotFound;
