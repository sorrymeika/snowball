
export default function mp4(cb) {
    require.ensure([], (require) => {
        require('./Player');
        require('./stream');
        cb(require('./MP4Player'));
    });
}