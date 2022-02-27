import colormap from 'colormap'

import { generateUID, rescale } from './utils.js'

const _attrs = Symbol('attrs')

const ColorMaps = {
  VIRIDIS: 'VIRIDIS',
  INFERNO: 'INFERNO',
  MAGMA: 'MAGMA',
  GRAY: 'GRAY',
  BLUE_RED: 'BLUE_RED',
  PHASE: 'PHASE',
  PORTLAND: 'PORTLAND',
  HOT: 'HOT'
}
Object.freeze(ColorMaps)

/** Create a color map.
 *
 * @param {object} options
 * @param {string} options.name - Name of the color map
 * @param {string} options.bins - Number of color bins
 *
 * @returns {number[][]} RGB triplet for each color
 */
function createColorMap ({ name, bins }) {
  const lut = {
    INFERNO: ['inferno', false],
    MAGMA: ['magma', false],
    VIRIDIS: ['viridis', false],
    GRAY: ['greys', false],
    BLUE_RED: ['RdBu', false],
    PHASE: ['phase', true],
    PORTLAND: ['portland', false],
    HOT: ['HOT', false]
  }
  const params = lut[name]
  if (params === undefined) {
    throw new Error(`Unknown colormap "${name}".`)
  }

  const internalName = params[0]
  const reverse = params[1]
  const colors = colormap({
    colormap: internalName,
    nshades: bins,
    format: 'rgb'
  })
  if (reverse) {
    return colors.reverse()
  }
  return colors
}

/**
 * Build a palette color lookup table object from a colormap.
 *
 * @param {object} options
 * @param {number[][]} options.colormap - Array of RGB triplets for each color
 * @param {number} options.min - Mininum value of the input data range
 * @param {number} options.max - Maximum value of the input data range
 *
 * @returns {PaletteColorLookupTable} Mapping of grayscale pixel values to RGB color triplets
 */
function _buildPaletteColorLookupTable ({
  data,
  firstValueMapped,
  bitsPerEntry
}) {
  const numberOfEntries = data.length

  let Type = Uint16Array
  if (bitsPerEntry === 8) {
    Type = Uint8Array
  }
  const redData = new Type(numberOfEntries)
  const greenData = new Type(numberOfEntries)
  const blueData = new Type(numberOfEntries)
  for (let i = 0; i < numberOfEntries; i++) {
    redData[i] = data[i][0]
    greenData[i] = data[i][1]
    blueData[i] = data[i][2]
  }

  const descriptor = [numberOfEntries, firstValueMapped, bitsPerEntry]

  return new PaletteColorLookupTable({
    uid: generateUID(),
    redDescriptor: descriptor,
    greenDescriptor: descriptor,
    blueDescriptor: descriptor,
    redData,
    greenData,
    blueData
  })
}

/**
 * A Palette Color Lookup Table
 */
class PaletteColorLookupTable {
  /**
   * Create a new PaletteColorLookupTable object.
   */
  constructor ({
    uid,
    redDescriptor,
    greenDescriptor,
    blueDescriptor,
    redData,
    greenData,
    blueData,
    redSegmentedData,
    greenSegmentedData,
    blueSegmentedData
  }) {
    this[_attrs] = { uid }

    // Number of entries in the LUT data
    const firstDescriptorValues = new Set([
      redDescriptor[0],
      greenDescriptor[0],
      blueDescriptor[0]
    ])
    if (firstDescriptorValues.size !== 1) {
      throw new Error(
        'First value of Red, Green, and Blue Palette Color Lookup Table ' +
        'Descriptor must be the same.'
      )
    }
    const n = [...firstDescriptorValues][0]
    if (n === 0) {
      this[_attrs].numberOfEntries = Math.pow(2, 16)
    } else {
      this[_attrs].numberOfEntries = n
    }

    // Pixel value mapped to the first entry in the LUT data
    const secondDescriptorValues = new Set([
      redDescriptor[1],
      greenDescriptor[1],
      blueDescriptor[1]
    ])
    if (secondDescriptorValues.size !== 1) {
      throw new Error(
        'Second value of Red, Green, and Blue Palette Color Lookup Table ' +
        'Descriptor must be the same.'
      )
    }
    this[_attrs].firstValueMapped = [...secondDescriptorValues][0]

    // Number of bits for each entry in the LUT Data
    const thirdDescriptorValues = new Set([
      redDescriptor[2],
      greenDescriptor[2],
      blueDescriptor[2]
    ])
    if (thirdDescriptorValues.size !== 1) {
      throw new Error(
        'Third value of Red, Green, and Blue Palette Color Lookup Table ' +
        'Descriptor must be the same.'
      )
    }
    this[_attrs].bitsPerEntry = [...thirdDescriptorValues][0]
    if ([8, 16].indexOf(this[_attrs].bitsPerEntry) < 0) {
      throw new Error(
        'Third value of Red, Green, and Blue Palette Color Lookup Table ' +
        'Descriptor must be either ' + '8 or 16.'
      )
    }

    if (redSegmentedData != null && redData != null) {
      throw new Error(
        'Either Segmented Red Palette Color Lookup Data or Red Palette ' +
        'Color Lookup Data should be provided, but not both.'
      )
    } else if (redSegmentedData == null && redData == null) {
      throw new Error(
        'Either Segmented Red Palette Color Lookup Data or Red Palette ' +
        'Color Lookup Data must be provided.'
      )
    }
    if (redData) {
      if (redData.length !== this[_attrs].numberOfEntries) {
        throw new Error(
          'Red Palette Color Lookup Table Data has wrong number of entries.'
        )
      }
    }
    this[_attrs].redSegmentedData = redSegmentedData
    this[_attrs].redData = redData

    if (greenSegmentedData != null && greenData != null) {
      throw new Error(
        'Either Segmented Green Palette Color Lookup Data or Green Palette ' +
        'Color Lookup Data should be provided, but not both.'
      )
    } else if (greenSegmentedData == null && greenData == null) {
      throw new Error(
        'Either Segmented Green Palette Color Lookup Data or Green ' +
        'Palette Color Lookup Data must be provided.'
      )
    }
    if (greenData) {
      if (greenData.length !== this[_attrs].numberOfEntries) {
        throw new Error(
          'Green Palette Color Lookup Table Data has wrong number of entries.'
        )
      }
    }
    this[_attrs].greenSegmentedData = greenSegmentedData
    this[_attrs].greenData = greenData

    if (blueSegmentedData != null && blueData != null) {
      throw new Error(
        'Either Segmented Blue Palette Color Lookup Data or Blue Palette ' +
        'Color Lookup Data must be provided, but not both.'
      )
    } else if (blueSegmentedData != null && blueData != null) {
      throw new Error(
        'Either Segmented Blue Palette Color Lookup Data or Blue Palette ' +
        'Color Lookup Data must be provided.'
      )
    }
    if (blueData) {
      if (blueData.length !== this[_attrs].numberOfEntries) {
        throw new Error(
          'Blue Palette Color Lookup Table Data has wrong number of entries.'
        )
      }
    }
    this[_attrs].blueSegmentedData = blueSegmentedData
    this[_attrs].blueData = blueData

    if (this[_attrs].bitsPerEntry === 8) {
      this[_attrs].DataType = Uint8Array
    } else {
      this[_attrs].DataType = Uint16Array
    }

    // Will be used to cache created colormap for repeated access
    this[_attrs].data = null

    Object.freeze(this)
  }

  _expandSegmentedLUTData (segmentedData) {
    const lut = new this[_attrs].DataType(this[_attrs].numberOfEntries)
    let offset = 0
    for (let i = 0; i < segmentedData.length; i++) {
      const opcode = segmentedData[i++]
      if (opcode === 0) {
        // Discrete
        const length = segmentedData[i++]
        const value = segmentedData[i]
        for (let j = offset; j < (offset + length); j++) {
          lut[j] = value
        }
        offset += length
      } else if (opcode === 1) {
        // Linear (interpolation)
        const length = segmentedData[i++]
        const endpoint = segmentedData[i]
        const startpoint = lut[offset - 1]
        const step = (endpoint - startpoint) / length
        for (let j = offset; j < (offset + length); j++) {
          lut[j] = Math.round(lut[j - 1] + step)
        }
        offset += length
      } else if (opcode === 2) {
        // TODO
        throw new Error(
          'Indirect segment type is not yet supported for ' +
          'Segmented Palette Color Lookup Table.'
        )
      } else {
        throw new Error(
          'Encountered unexpected segment type is not yet supported for ' +
          'Segmented Palette Color Lookup Table.'
        )
      }
    }
    return lut
  }

  /**
   * Get Palette Color Lookup Table UID
   *
   * @returns {string} Palette Color Lookup Table UID
   */
  get uid () {
    return this[_attrs].uid
  }

  /**
   * Get Palette Color Lookup Table Data
   *
   * @returns {number[][]} Palette Color Lookup Table Data
   */
  get data () {
    if (this[_attrs].data == null) {
      const redLUT = (
        this[_attrs].redData
          ? new this[_attrs].DataType(this[_attrs].redData)
          : this._expandSegmentedLUTData(
            this[_attrs].redSegmentedData,
            this[_attrs].numberOfEntries,
            this[_attrs].bitsPerEntry
          )
      )
      const greenLUT = (
        this[_attrs].greenData
          ? new this[_attrs].DataType(this[_attrs].greenData)
          : this._expandSegmentedLUTData(
            this[_attrs].greenSegmentedData,
            this[_attrs].numberOfEntries,
            this[_attrs].bitsPerEntry
          )
      )
      const blueLUT = (
        this[_attrs].blueData
          ? new this[_attrs].DataType(this[_attrs].blueData)
          : this._expandSegmentedLUTData(
            this[_attrs].blueSegmentedData,
            this[_attrs].numberOfEntries,
            this[_attrs].bitsPerEntry
          )
      )
      const uniqueNumberOfEntries = new Set([
        redLUT.length,
        blueLUT.length,
        blueLUT.length
      ])
      if (uniqueNumberOfEntries.size > 1) {
        throw new Error(
          'Red, Green, and Blue Palette Color Lookup Tables ' +
          'must have the same size.'
        )
      }

      if (this[_attrs].bitsPerEntry === 16) {
        /*
         * Only palettes with 256 entries and 8 bit per entry are supported for
         * display.  Therefore, data need to rescaled and resampled.
         */
        const maxInput = Math.pow(2, 16) - 1
        const maxOutput = Math.pow(2, 8) - 1
        const steps = Math.pow(2, 16) / Math.pow(2, 8)
        this[_attrs].data = new Array(steps)
        for (let i = 0; i < steps; i++) {
          const j = i * steps
          this[_attrs].data[i] = [
            Math.round(rescale(redLUT[j], 0, maxInput, 0, maxOutput)),
            Math.round(rescale(greenLUT[j], 0, maxInput, 0, maxOutput)),
            Math.round(rescale(blueLUT[j], 0, maxInput, 0, maxOutput))
          ]
        }
      } else {
        this[_attrs].data = new Array(this[_attrs].numberOfEntries)
        for (let i = 0; i < this[_attrs].numberOfEntries; i++) {
          this[_attrs].data[i] = [
            redLUT[i],
            greenLUT[i],
            blueLUT[i]
          ]
        }
      }
    }
    return this[_attrs].data
  }

  /**
   * Get first value mapped
   *
   * @returns {number} first value mapped
   */
  get firstValueMapped () {
    return this[_attrs].firstValueMapped
  }
}

export {
  ColorMaps,
  createColorMap,
  PaletteColorLookupTable,
  _buildPaletteColorLookupTable
}
