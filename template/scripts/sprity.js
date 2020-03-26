var fs = require('fs');
var fse = require('snowball/node-libs/fs');
var path = require('path');

var sharp = require('sharp');

async function combineImages(out, srcs, callback) {
  const className = path.basename(out);
  const metadatas = await Promise.all(srcs.map(src => sharp(src).metadata()));

  const margin = 2;
  const images = [];

  let maxWidth = 0;
  let height = 0;

  metadatas.forEach((metadata, i) => {
    const img = {
      src: srcs[i]
    };
    img.w = metadata.width % 2 != 0 ? metadata.width + 1 : metadata.width;
    img.h = metadata.height % 2 != 0 ? metadata.height + 1 : metadata.height;

    img.left = margin;
    height += margin;

    img.top = height;
    height += (img.h + margin);

    if (img.w > maxWidth) maxWidth = img.w;

    images.push(img);
  });

  const styles = images.map((img) => {
    return {
      name: path.basename(img.alt).replace(/\.(png|jpg|jpeg|gif)$/, ''),
      x: img.left - margin,
      y: img.top - margin,
      width: img.w + margin * 2,
      height: img.h + margin * 2
    };
  });

  const outImageWidth = maxWidth + margin * 2;

  const outDir = path.dirname(out);

  fse.mkdirs(outDir, function () {
    const outputSrc = path.resolve(outDir, "sprite-" + className + ".png");

    sharp({
      create: {
        width: outImageWidth,
        height: height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite(images.map((img) => {
        return {
          top: img.top,
          left: img.left
        };
      }))
      .png()
      .toFile(outputSrc, () => {
        callback({
          width: outImageWidth,
          height: height,
          name: className,
          imageSrc: outputSrc,
          images: styles
        });
      });
  });
}

var create = function (options, cb) {
  var src = options.src,
    out = options.out,
    outStylePath = path.resolve(out, options.style || "./sprite.scss");

  var combineCount = 0;
  var layouts = [];
  var combineCallback = function (result) {
    var imageSrc = path.relative(path.dirname(outStylePath), result.imageSrc);

    layouts.push({
      name: result.name,
      src: imageSrc,
      images: result.images,
      width: result.width,
      height: result.height,
    });

    combineCount--;
    if (combineCount == 0) {
      var codes = "";

      layouts.forEach(function (layout) {
        var styleCode;
        var commonStyle = 'background-image: url("' + layout.src + '");content:\'\';display:inline-block;font-size:0px;vertical-align:middle;';
        var pxClassNames = "";
        var remClassNames = "";
        var styles = "";

        layout.images.forEach(function (img) {
          var className = "." + layout.name + '-' + img.name;

          pxClassNames += className + ':before,';
          remClassNames += className + '-rem:before,';

          styles += className + ':before{background-position: -' + (img.x / 2) + 'px -' + (img.y / 2) + 'px; width: ' + (img.width / 2) + 'px; height: ' + (img.height / 2) + 'px;}\n';
          styles += className + '-rem:before{background-position: -' + (img.x / 200) + 'rem -' + (img.y / 200) + 'rem; width: ' + (img.width / 200) + 'rem; height: ' + (img.height / 200) + 'rem;}\n';
        });

        pxClassNames = pxClassNames.substr(0, pxClassNames.length - 1);
        remClassNames = remClassNames.substr(0, remClassNames.length - 1);

        styleCode = pxClassNames + ',' + remClassNames + "{" + commonStyle + "background-size: " + (layout.width / 2) + "px " + (layout.height / 2) + "px;" + "}\n";
        styleCode += remClassNames + "{background-size: " + (layout.width / 200) + "rem " + (layout.height / 200) + "rem;}\n";

        codes += styleCode + styles;
      });

      fse.mkdirs(path.dirname(outStylePath), function () {
        fs.writeFile(outStylePath, codes, 'utf8', function () {
          console.log('saved ' + outStylePath);
          cb && cb(null);
        });
      });
    }
  };

  fs.readdir(src, function (err, files) {
    if (err) {
      console.error(err);
      return cb && cb(err);
    }

    var count = 0;
    var rootImages = [];

    files.forEach(function (file) {
      count++;

      file = path.resolve(src, file);

      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          combineCount++;

          fse.find(file, '*.(png|jpg|jpeg|gif)', function (err, images) {
            if (err || !images || images.length == 0) {
              combineCount--;
              return;
            }
            combineImages(path.resolve(out, path.basename(file)), images, combineCallback);
          });

        } else {
          var ext = path.extname(file);

          if (/^\.(png|jpg|jpeg|gif)$/.test(ext)) {
            rootImages.push(file);
          }
        }
        count--;

        if (count == 0 && rootImages.length != 0) {
          combineCount++;
          combineImages(path.resolve(out, path.basename(src)), rootImages, combineCallback);
        }
      });
    });

  });
};

module.exports = create;

create({
  src: "./src/sprity/images",
  out: "./src/sprity",
  style: "./sprite.scss"
});
