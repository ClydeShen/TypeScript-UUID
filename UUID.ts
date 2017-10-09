// Type definitions for UUID.js v3.3.0
// Project: https://github.com/LiosK/UUID.js
// Definitions by: Jason Jarrett <https://github.com/staxmanade/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

export class UUID {
  intFields:number[];
  bitFields:string[];
  hexFields:string[];
  version:number;
  bitString:string;
  hexString:string;
  hexNoDelim:string;
  urn:string;


  constructor() {
  }

  /**
   * Names of each UUID field.
   * @type string[]
   * @constant
   * @since 3.0
   */
  private static FIELD_NAMES = ["timeLow", "timeMid", "timeHiAndVersion",
    "clockSeqHiAndReserved", "clockSeqLow", "node"];

  /**
   * Sizes of each UUID field.
   * @type int[]
   * @constant
   * @since 3.0
   */
  private static FIELD_SIZES = [32, 16, 16, 8, 8, 48];

  private static _tsRatio = 1 / 4;


  _init(timeLow, timeMid, timeHiAndVersion, clockSeqHiAndReserved, clockSeqLow, node) {
    var names = UUID.FIELD_NAMES, sizes = UUID.FIELD_SIZES;
    var bin = UUID._binAligner, hex = UUID._hexAligner;
    /**
     * List of UUID field values (as integer values).
     * @type int[]
     */
    this.intFields = new Array(6);
    /**
     * List of UUID field values (as binary bit string values).
     * @type string[]
     */
    this.bitFields = new Array(6);
    /**
     * List of UUID field values (as hexadecimal string values).
     * @type string[]
     */
    this.hexFields = new Array(6);
    for (var i = 0; i < 6; i++) {
      var intValue = parseInt(arguments[i] || 0);
      this.intFields[i] = this.intFields[names[i]] = intValue;
      this.bitFields[i] = this.bitFields[names[i]] = bin(intValue, sizes[i]);
      this.hexFields[i] = this.hexFields[names[i]] = hex(intValue, sizes[i] / 4);
    }
    /**
     * UUID version number defined in RFC 4122.
     * @type int
     */
    this.version = (this.intFields[2] >> 12) & 0xF;

    /**
     * 128-bit binary bit string representation.
     * @type string
     */
    this.bitString = this.bitFields.join("");

    /**
     * Non-delimited hexadecimal string representation ("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx").
     * @type string
     * @since v3.3.0
     */
    this.hexNoDelim = this.hexFields.join("");

    /**
     * UUID hexadecimal string representation ("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx").
     * @type string
     */
    this.hexString = this.hexFields[0] + "-" + this.hexFields[1] + "-" + this.hexFields[2]
      + "-" + this.hexFields[3] + this.hexFields[4] + "-" + this.hexFields[5];

    /**
     * UUID string representation as a URN ("urn:uuid:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx").
     * @type string
     */
    this.urn = "urn:uuid:" + this.hexString;

    return this;
  }

  equals(uuid:UUID):boolean {
    if (!(uuid instanceof UUID)) {
      return false;
    }
    for (var i = 0; i < 6; i++) {
      if (this.intFields[i] !== uuid.intFields[i]) {
        return false;
      }
    }
    return true;
  }

  toString() {
    return this.hexString;
  }

  /**
   * The simplest function to get an UUID string.
   * @returns {string} A version 4 UUID string.
   */
  public static generate(o?:any) {
    var rand = UUID._getRandomInt, hex = UUID._hexAligner;
    return hex(rand(32), 8)          // time_low
      + "-"
      + hex(rand(16), 4)          // time_mid
      + "-"
      + hex(0x4000 | rand(12), 4) // time_hi_and_version
      + "-"
      + hex(0x8000 | rand(14), 4) // clock_seq_hi_and_reserved clock_seq_low
      + "-"
      + hex(rand(48), 12);        // node
  }

  private static genV1() {
    var now = new Date().getTime(), st = UUID._state;
    if (now != st.timestamp) {
      if (now < st.timestamp) {
        st.sequence++;
      }
      st.timestamp = now;
      st.tick = UUID._getRandomInt(4);
    } else if (Math.random() < UUID._tsRatio && st.tick < 9984) {
      // advance the timestamp fraction at a probability
      // to compensate for the low timestamp resolution
      st.tick += 1 + UUID._getRandomInt(4);
    } else {
      st.sequence++;
    }

    // format time fields
    var tf = UUID._getTimeFieldValues(st.timestamp);
    var tl = tf.low + st.tick;
    var thav = (tf.hi & 0xFFF) | 0x1000;  // set version '0001'

    // format clock sequence
    st.sequence &= 0x3FFF;
    var cshar = (st.sequence >>> 8) | 0x80; // set variant '10'
    var csl = st.sequence & 0xFF;

    return new UUID()._init(tl, tf.mid, thav, cshar, csl, st.node);
  }

  /**
   * Generates a version 4 {@link UUID}.
   * @returns {UUID} A version 4 {@link UUID} object.
   * @since 3.0
   */
  private static genV4() {
    var rand = UUID._getRandomInt;
    return new UUID()._init(rand(32), rand(16), // time_low time_mid
      0x4000 | rand(12),  // time_hi_and_version
      0x80 | rand(6),   // clock_seq_hi_and_reserved
      rand(8), rand(48));
  }

  public static parse(strId:string) {
    var r, p = /^\s*(urn:uuid:|\{)?([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{2})([0-9a-f]{2})-([0-9a-f]{12})(\})?\s*$/i;
    if (r = p.exec(strId)) {
      var l = r[1] || "", t = r[8] || "";
      if (((l + t) === "") ||
        (l === "{" && t === "}") ||
        (l.toLowerCase() === "urn:uuid:" && t === "")) {
        return new UUID()._init(parseInt(r[2], 16), parseInt(r[3], 16),
          parseInt(r[4], 16), parseInt(r[5], 16),
          parseInt(r[6], 16), parseInt(r[7], 16));
      }
    }
    return null;
  }

  /**
   * Returns an unsigned x-bit random integer.
   * @param {int} x A positive integer ranging from 0 to 53, inclusive.
   * @returns {int} An unsigned x-bit random integer (0 <= f(x) < 2^x).
   */
  private static _getRandomInt(x) {
    if (x < 0) return NaN;
    if (x <= 30) return (0 | Math.random() * (1 << x));
    if (x <= 53) return (0 | Math.random() * (1 << 30))
      + (0 | Math.random() * (1 << x - 30)) * (1 << 30);
    return NaN;
  }

  /**
   * Returns a function that converts an integer to a zero-filled string.
   * @param {int} radix
   * @returns {function(num&#44; length)}
   */
  private static _getIntAligner(radix) {
    return function (num, length) {
      var str = num.toString(radix), i = length - str.length, z = "0";
      for (; i > 0; i >>>= 1, z += z) {
        if (i & 1) {
          str = z + str;
        }
      }
      return str;
    };
  }

  private static _hexAligner = UUID._getIntAligner(16);

  private static _binAligner = UUID._getIntAligner(2);

  private static resetState() {
    UUID._state = new UUID._state.constructor();
  }

  private static _state = new function UUIDState() {
    var rand = UUID._getRandomInt;
    this.timestamp = 0;
    this.sequence = rand(14);
    this.node = (rand(8) | 1) * 0x10000000000 + rand(40); // set multicast bit '1'
    this.tick = rand(4);  // timestamp fraction smaller than a millisecond
  };

  /**
   * @param {Date|int} time ECMAScript Date Object or milliseconds from 1970-01-01.
   * @returns {object}
   */
  private static _getTimeFieldValues(time) {
    var ts = time - Date.UTC(1582, 9, 15);
    var hm = ((ts / 0x100000000) * 10000) & 0xFFFFFFF;
    return {
      low: ((ts & 0xFFFFFFF) * 10000) % 0x100000000,
      mid: hm & 0xFFFF, hi: hm >>> 16, timestamp: ts
    };
  }

  private static makeBackwardCompatible() {
    var f = UUID.generate;
    UUID.generate = function (o) {
      return (o && o.version == 1) ? UUID.genV1().hexString : f.call(UUID);
    };
    UUID.makeBackwardCompatible = function () {
    };
  }

  public static Empty = UUID.parse("00000000-0000-0000-0000-000000000000");
}

