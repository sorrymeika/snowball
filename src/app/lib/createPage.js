import { Activity } from './Activity';
import { Page } from './Page';
import { Location } from '../types';

type PageProps = { location: Location };
type MapPropsToStore = (props: PageProps, page: Page) => any;

export default function createPage(mapPropsToStore: MapPropsToStore) {
    return (viewFactory) => {
        const createActivity = (location, application) => new Activity(viewFactory, location, application, mapPropsToStore);
        createActivity.__is_activity_factory__ = true;
        return createActivity;
    };
}
