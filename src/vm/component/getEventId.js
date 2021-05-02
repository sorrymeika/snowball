

export default function getEventId(componentState, eventName) {
    return 'sn' + componentState.state.id + '-on' + eventName;
}