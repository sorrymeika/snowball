define(function () {
    // constructor:
    /**
    * Represents an affine transformation matrix, and provides tools for constructing and concatenating matrices.
    *
    * This matrix can be visualized as:
    *
    * 	[ a  c  tx
    * 	  b  d  ty
    * 	  0  0  1  ]
    *
    * Note the locations of b and c.
    *
    * @class Matrix2D
    * @param {Number} [a=1] Specifies the a property for the new matrix.
    * @param {Number} [b=0] Specifies the b property for the new matrix.
    * @param {Number} [c=0] Specifies the c property for the new matrix.
    * @param {Number} [d=1] Specifies the d property for the new matrix.
    * @param {Number} [tx=0] Specifies the tx property for the new matrix.
    * @param {Number} [ty=0] Specifies the ty property for the new matrix.
    * @constructor
    **/
    function Matrix2D(a,b,c,d,tx,ty) {
        this.setValues(a,b,c,d,tx,ty);

        // public properties:
        // assigned in the setValues method.
        /**
        * Position (0, 0) in a 3x3 affine transformation matrix.
        * @property a
        * @type Number
        **/

        /**
        * Position (0, 1) in a 3x3 affine transformation matrix.
        * @property b
        * @type Number
        **/

        /**
        * Position (1, 0) in a 3x3 affine transformation matrix.
        * @property c
        * @type Number
        **/

        /**
        * Position (1, 1) in a 3x3 affine transformation matrix.
        * @property d
        * @type Number
        **/

        /**
        * Position (2, 0) in a 3x3 affine transformation matrix.
        * @property tx
        * @type Number
        **/

        /**
        * Position (2, 1) in a 3x3 affine transformation matrix.
        * @property ty
        * @type Number
        **/
    }
    var p=Matrix2D.prototype;

    /**
    * <strong>REMOVED</strong>. Removed in favor of using `MySuperClass_constructor`.
    * See {{#crossLink "Utility Methods/extend"}}{{/crossLink}} and {{#crossLink "Utility Methods/promote"}}{{/crossLink}}
    * for details.
    *
    * There is an inheritance tutorial distributed with EaselJS in /tutorials/Inheritance.
    *
    * @method initialize
    * @protected
    * @deprecated
    */
    // p.initialize = function() {}; // searchable for devs wondering where it is.


    // constants:
    /**
    * Multiplier for converting degrees to radians. Used internally by Matrix2D.
    * @property DEG_TO_RAD
    * @static
    * @final
    * @type Number
    * @readonly
    **/
    Matrix2D.DEG_TO_RAD=Math.PI/180;


    // static public properties:
    /**
    * An identity matrix, representing a null transformation.
    * @property identity
    * @static
    * @type Matrix2D
    * @readonly
    **/
    Matrix2D.identity = null; // set at bottom of class definition.
    
    p.length = 6;

    // public methods:
    /**
    * Sets the specified values on this instance. 
    * @method setValues
    * @param {Number} [a=1] Specifies the a property for the new matrix.
    * @param {Number} [b=0] Specifies the b property for the new matrix.
    * @param {Number} [c=0] Specifies the c property for the new matrix.
    * @param {Number} [d=1] Specifies the d property for the new matrix.
    * @param {Number} [tx=0] Specifies the tx property for the new matrix.
    * @param {Number} [ty=0] Specifies the ty property for the new matrix.
    * @return {Matrix2D} This instance. Useful for chaining method calls.
    */
    p.setValues=function (a,b,c,d,tx,ty) {
        // don't forget to update docs in the constructor if these change:
        this[0]=(a==null)?1:a;
        this[1]=b||0;
        this[2]=c||0;
        this[3]=(d==null)?1:d;
        this[4]=tx||0;
        this[5]=ty||0;
        return this;
    };

    /**
    * Appends the specified matrix properties to this matrix. All parameters are required.
    * This is the equivalent of multiplying `(this matrix) * (specified matrix)`.
    * @method append
    * @param {Number} a
    * @param {Number} b
    * @param {Number} c
    * @param {Number} d
    * @param {Number} tx
    * @param {Number} ty
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    **/
    p.append=function (a,b,c,d,tx,ty) {
        var a1=this[0];
        var b1=this[1];
        var c1=this[2];
        var d1=this[3];
        if(a!=1||b!=0||c!=0||d!=1) {
            this[0]=a1*a+c1*b;
            this[1]=b1*a+d1*b;
            this[2]=a1*c+c1*d;
            this[3]=b1*c+d1*d;
        }
        this[4]=a1*tx+c1*ty+this[4];
        this[5]=b1*tx+d1*ty+this[5];
        return this;
    };

    /**
    * Prepends the specified matrix properties to this matrix.
    * This is the equivalent of multiplying `(specified matrix) * (this matrix)`.
    * All parameters are required.
    * @method prepend
    * @param {Number} a
    * @param {Number} b
    * @param {Number} c
    * @param {Number} d
    * @param {Number} tx
    * @param {Number} ty
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    **/
    p.prepend=function (a,b,c,d,tx,ty) {
        var a1=this[0];
        var c1=this[2];
        var tx1=this[4];

        this[0]=a*a1+c*this[1];
        this[1]=b*a1+d*this[1];
        this[2]=a*c1+c*this[3];
        this[3]=b*c1+d*this[3];
        this[4]=a*tx1+c*this[5]+tx;
        this[5]=b*tx1+d*this[5]+ty;
        return this;
    };

    /**
    * Appends the specified matrix to this matrix.
    * This is the equivalent of multiplying `(this matrix) * (specified matrix)`.
    * @method appendMatrix
    * @param {Matrix2D} matrix
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    **/
    p.appendMatrix=function (matrix) {
        return this.append(matrix[0],matrix[1],matrix[2],matrix[3],matrix[4],matrix[5]);
    };

    /**
    * Prepends the specified matrix to this matrix.
    * This is the equivalent of multiplying `(specified matrix) * (this matrix)`.
    * For example, you could calculate the combined transformation for a child object using:
    * 
    * 	var o = myDisplayObject;
    * 	var mtx = o.getMatrix();
    * 	while (o = o.parent) {
    * 		// prepend each parent's transformation in turn:
    * 		o.prependMatrix(o.getMatrix());
    * 	}
    * @method prependMatrix
    * @param {Matrix2D} matrix
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    **/
    p.prependMatrix=function (matrix) {
        return this.prepend(matrix[0],matrix[1],matrix[2],matrix[3],matrix[4],matrix[5]);
    };

    /**
    * Generates matrix properties from the specified display object transform properties, and appends them to this matrix.
    * For example, you can use this to generate a matrix representing the transformations of a display object:
    * 
    * 	var mtx = new Matrix2D();
    * 	mtx.appendTransform(o.x, o.y, o.scaleX, o.scaleY, o.rotation);
    * @method appendTransform
    * @param {Number} x
    * @param {Number} y
    * @param {Number} scaleX
    * @param {Number} scaleY
    * @param {Number} rotation
    * @param {Number} skewX
    * @param {Number} skewY
    * @param {Number} regX Optional.
    * @param {Number} regY Optional.
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    **/
    p.appendTransform=function (x,y,scaleX,scaleY,rotation,skewX,skewY,regX,regY) {
        if(rotation%360) {
            var r=rotation*Matrix2D.DEG_TO_RAD;
            var cos=Math.cos(r);
            var sin=Math.sin(r);
        } else {
            cos=1;
            sin=0;
        }

        if(skewX||skewY) {
            // TODO: can this be combined into a single append operation?
            skewX*=Matrix2D.DEG_TO_RAD;
            skewY*=Matrix2D.DEG_TO_RAD;
            this.append(Math.cos(skewY),Math.sin(skewY),-Math.sin(skewX),Math.cos(skewX),x,y);
            this.append(cos*scaleX,sin*scaleX,-sin*scaleY,cos*scaleY,0,0);
        } else {
            this.append(cos*scaleX,sin*scaleX,-sin*scaleY,cos*scaleY,x,y);
        }

        if(regX||regY) {
            // append the registration offset:
            this[4]-=regX*this[0]+regY*this[2];
            this[5]-=regX*this[1]+regY*this[3];
        }
        return this;
    };

    /**
    * Generates matrix properties from the specified display object transform properties, and prepends them to this matrix.
    * For example, you could calculate the combined transformation for a child object using:
    * 
    * 	var o = myDisplayObject;
    * 	var mtx = new createjs.Matrix2D();
    * 	do  {
    * 		// prepend each parent's transformation in turn:
    * 		mtx.prependTransform(o.x, o.y, o.scaleX, o.scaleY, o.rotation, o.skewX, o.skewY, o.regX, o.regY);
    * 	} while (o = o.parent);
    * 	
    * 	Note that the above example would not account for {{#crossLink "DisplayObject/transformMatrix:property"}}{{/crossLink}}
    * 	values. See {{#crossLink "Matrix2D/prependMatrix"}}{{/crossLink}} for an example that does.
    * @method prependTransform
    * @param {Number} x
    * @param {Number} y
    * @param {Number} scaleX
    * @param {Number} scaleY
    * @param {Number} rotation
    * @param {Number} skewX
    * @param {Number} skewY
    * @param {Number} regX Optional.
    * @param {Number} regY Optional.
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    **/
    p.prependTransform=function (x,y,scaleX,scaleY,rotation,skewX,skewY,regX,regY) {
        if(rotation%360) {
            var r=rotation*Matrix2D.DEG_TO_RAD;
            var cos=Math.cos(r);
            var sin=Math.sin(r);
        } else {
            cos=1;
            sin=0;
        }

        if(regX||regY) {
            // prepend the registration offset:
            this[4]-=regX;this[5]-=regY;
        }
        if(skewX||skewY) {
            // TODO: can this be combined into a single prepend operation?
            skewX*=Matrix2D.DEG_TO_RAD;
            skewY*=Matrix2D.DEG_TO_RAD;
            this.prepend(cos*scaleX,sin*scaleX,-sin*scaleY,cos*scaleY,0,0);
            this.prepend(Math.cos(skewY),Math.sin(skewY),-Math.sin(skewX),Math.cos(skewX),x,y);
        } else {
            this.prepend(cos*scaleX,sin*scaleX,-sin*scaleY,cos*scaleY,x,y);
        }
        return this;
    };

    /**
    * Applies a clockwise rotation transformation to the matrix.
    * @method rotate
    * @param {Number} angle The angle to rotate by, in degrees. To use a value in radians, multiply it by `180/Math.PI`.
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    **/
    p.rotate=function (angle) {
        angle=angle*Matrix2D.DEG_TO_RAD;
        var cos=Math.cos(angle);
        var sin=Math.sin(angle);

        var a1=this[0];
        var b1=this[1];

        this[0]=a1*cos+this[2]*sin;
        this[1]=b1*cos+this[3]*sin;
        this[2]= -a1*sin+this[2]*cos;
        this[3]= -b1*sin+this[3]*cos;
        return this;
    };

    /**
    * Applies a skew transformation to the matrix.
    * @method skew
    * @param {Number} skewX The amount to skew horizontally in degrees. To use a value in radians, multiply it by `180/Math.PI`.
    * @param {Number} skewY The amount to skew vertically in degrees.
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    */
    p.skew=function (skewX,skewY) {
        skewX=skewX*Matrix2D.DEG_TO_RAD;
        skewY=skewY*Matrix2D.DEG_TO_RAD;
        this.append(Math.cos(skewY),Math.sin(skewY),-Math.sin(skewX),Math.cos(skewX),0,0);
        return this;
    };

    /**
    * Applies a scale transformation to the matrix.
    * @method scale
    * @param {Number} x The amount to scale horizontally. E.G. a value of 2 will double the size in the X direction, and 0.5 will halve it.
    * @param {Number} y The amount to scale vertically.
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    **/
    p.scale=function (x,y) {
        this[0]*=x;
        this[1]*=x;
        this[2]*=y;
        this[3]*=y;
        //this[4] *= x;
        //this[5] *= y;
        return this;
    };

    /**
    * Translates the matrix on the x and y axes.
    * @method translate
    * @param {Number} x
    * @param {Number} y
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    **/
    p.translate=function (x,y) {
        this[4]+=this[0]*x+this[2]*y;
        this[5]+=this[1]*x+this[3]*y;
        return this;
    };

    /**
    * Sets the properties of the matrix to those of an identity matrix (one that applies a null transformation).
    * @method identity
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    **/
    p.identity=function () {
        this[0]=this[3]=1;
        this[1]=this[2]=this[4]=this[5]=0;
        return this;
    };

    /**
    * Inverts the matrix, causing it to perform the opposite transformation.
    * @method invert
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    **/
    p.invert=function () {
        var a1=this[0];
        var b1=this[1];
        var c1=this[2];
        var d1=this[3];
        var tx1=this[4];
        var n=a1*d1-b1*c1;

        this[0]=d1/n;
        this[1]= -b1/n;
        this[2]= -c1/n;
        this[3]=a1/n;
        this[4]=(c1*this[5]-d1*tx1)/n;
        this[5]= -(a1*this[5]-b1*tx1)/n;
        return this;
    };

    /**
    * Returns true if the matrix is an identity matrix.
    * @method isIdentity
    * @return {Boolean}
    **/
    p.isIdentity=function () {
        return this[4]===0&&this[5]===0&&this[0]===1&&this[1]===0&&this[2]===0&&this[3]===1;
    };

    /**
    * Returns true if this matrix is equal to the specified matrix (all property values are equal).
    * @method equals
    * @param {Matrix2D} matrix The matrix to compare.
    * @return {Boolean}
    **/
    p.equals=function (matrix) {
        return this[4]===matrix[4]&&this[5]===matrix[5]&&this[0]===matrix[0]&&this[1]===matrix[1]&&this[2]===matrix[2]&&this[3]===matrix[3];
    };

    /**
    * Transforms a point according to this matrix.
    * @method transformPoint
    * @param {Number} x The x component of the point to transform.
    * @param {Number} y The y component of the point to transform.
    * @param {Point | Object} [pt] An object to copy the result into. If omitted a generic object with x/y properties will be returned.
    * @return {Point} This matrix. Useful for chaining method calls.
    **/
    p.transformPoint=function (x,y,pt) {
        pt=pt||{};
        pt.x=x*this[0]+y*this[2]+this[4];
        pt.y=x*this[1]+y*this[3]+this[5];
        return pt;
    };

    /**
    * Decomposes the matrix into transform properties (x, y, scaleX, scaleY, and rotation). Note that these values
    * may not match the transform properties you used to generate the matrix, though they will produce the same visual
    * results.
    * @method decompose
    * @param {Object} target The object to apply the transform properties to. If null, then a new object will be returned.
    * @return {Object} The target, or a new generic object with the transform properties applied.
    */
    p.decompose=function (target) {
        // TODO: it would be nice to be able to solve for whether the matrix can be decomposed into only scale/rotation even when scale is negative
        if(target==null) { target={}; }
        target.x=this[4];
        target.y=this[5];
        target.scaleX=Math.sqrt(this[0]*this[0]+this[1]*this[1]);
        target.scaleY=Math.sqrt(this[2]*this[2]+this[3]*this[3]);

        var skewX=Math.atan2(-this[2],this[3]);
        var skewY=Math.atan2(this[1],this[0]);

        var delta=Math.abs(1-skewX/skewY);
        if(delta<0.00001) { // effectively identical, can use rotation:
            target.rotation=skewY/Matrix2D.DEG_TO_RAD;
            if(this[0]<0&&this[3]>=0) {
                target.rotation+=(target.rotation<=0)?180:-180;
            }
            target.skewX=target.skewY=0;
        } else {
            target.skewX=skewX/Matrix2D.DEG_TO_RAD;
            target.skewY=skewY/Matrix2D.DEG_TO_RAD;
        }
        return target;
    };

    /**
    * Copies all properties from the specified matrix to this matrix.
    * @method copy
    * @param {Matrix2D} matrix The matrix to copy properties from.
    * @return {Matrix2D} This matrix. Useful for chaining method calls.
    */
    p.copy=function (matrix) {
        return this.setValues(matrix[0],matrix[1],matrix[2],matrix[3],matrix[4],matrix[5]);
    };

    /**
    * Returns a clone of the Matrix2D instance.
    * @method clone
    * @return {Matrix2D} a clone of the Matrix2D instance.
    **/
    p.clone=function () {
        return new Matrix2D(this[0],this[1],this[2],this[3],this[4],this[5]);
    };

    /**
    * Returns a string representation of this object.
    * @method toString
    * @return {String} a string representation of the instance.
    **/
    p.toString=function () {
        return "matrix("+this[0]+","+this[1]+","+this[2]+","+this[3]+","+this[4]+","+this[5]+")";
    };

    return Matrix2D;
});