var fs = require('fs');
var fse = require('../src/node-libs/fs');
var path = require('path');

var Canvas = require('canvas');
var Image = Canvas.Image;

function combineImages(out, srcs, callback) {
  var count = 0;
  var images = [];
  var className = path.basename(out);

  srcs.forEach(function (src) {
    count++;

    fs.readFile(src, function (err, buffer) {
      if (err) throw err;
      var img = new Image();
      img.src = buffer;
      img.alt = src;

      images.push(img);

      count--;

      if (count == 0) {

        var maxWidth = 0;
        var height = 0;
        var margin = 2;

        for (let i = 0, j = images.length; i < j; i++) {
          img = images[i];

          img.w = img.width % 2 != 0 ? img.width + 1 : img.width;
          img.h = img.height % 2 != 0 ? img.height + 1 : img.height;

          img.left = margin;
          height += margin;

          img.top = height;

          height += (img.h + margin);

          if (img.w > maxWidth) maxWidth = img.w;
        }

        var outImageWidth = maxWidth + margin * 2;
        var canvas = new Canvas(outImageWidth, height);
        var ctx = canvas.getContext('2d');
        var results = [];

        for (let i = 0, j = images.length; i < j; i++) {
          img = images[i];

          results.push({
            name: path.basename(img.alt).replace(/\.(png|jpg|jpeg|gif)$/, ''),
            x: img.left - margin,
            y: img.top - margin,
            width: img.w + margin * 2,
            height: img.h + margin * 2
          });

          ctx.drawImage(img, img.left, img.top, img.w, img.h);
        }

        var outDir = path.dirname(out);

        fse.mkdirs(outDir, function () {
          out = path.resolve(outDir, "sprite-" + className + ".png");

          var output = fs.createWriteStream(out),
            stream = canvas.pngStream();

          stream.on('data', function (chunk) {
            output.write(chunk);
          });

          stream.on('end', function () {
            console.log('saved ' + out);

            callback({
              width: outImageWidth,
              height: height,
              name: className,
              imageSrc: out,
              images: results
            });
          });
        });

      }
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
  src: "./sprity/images",
  out: "./sprity",
  style: "./sprite.scss"
});

