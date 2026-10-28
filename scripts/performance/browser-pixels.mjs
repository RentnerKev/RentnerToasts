import { inflateSync } from 'node:zlib'
import { createHash } from 'node:crypto'

/** Decode Chromium's noninterlaced 8-bit RGB/RGBA PNG in memory; compare pixels, not PNG metadata/compression. */
export function screenshotPixels(png) {
    if (
        !png
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
        throw new Error('Screenshot is not a PNG')
    let width, height, channels
    const chunks = []
    for (let offset = 8; offset < png.length;) {
        const length = png.readUInt32BE(offset)
        const kind = png.toString('ascii', offset + 4, offset + 8)
        const chunk = png.subarray(offset + 8, offset + 8 + length)
        if (kind === 'IHDR') {
            width = chunk.readUInt32BE(0)
            height = chunk.readUInt32BE(4)
            if (chunk[8] !== 8 || ![2, 6].includes(chunk[9]) || chunk[12] !== 0)
                throw new Error('Unsupported screenshot PNG layout')
            channels = chunk[9] === 2 ? 3 : 4
        } else if (kind === 'IDAT') chunks.push(chunk)
        offset += length + 12
    }
    if (!width || !height || !channels) throw new Error('Missing PNG header')
    const stride = width * channels
    const filtered = inflateSync(Buffer.concat(chunks))
    if (filtered.length !== height * (stride + 1))
        throw new Error('Unexpected PNG payload length')
    const pixels = Buffer.alloc(width * height * 4)
    let previous = Buffer.alloc(stride)
    for (let y = 0; y < height; y++) {
        const filter = filtered[y * (stride + 1)]
        const row = Buffer.from(
            filtered.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)),
        )
        for (let index = 0; index < stride; index++) {
            const left = index >= channels ? row[index - channels] : 0
            const above = previous[index]
            const diagonal = index >= channels ? previous[index - channels] : 0
            let predictor = 0
            if (filter === 1) predictor = left
            else if (filter === 2) predictor = above
            else if (filter === 3) predictor = Math.floor((left + above) / 2)
            else if (filter === 4) {
                const target = left + above - diagonal
                const a = Math.abs(target - left),
                    b = Math.abs(target - above),
                    c = Math.abs(target - diagonal)
                predictor = a <= b && a <= c ? left : b <= c ? above : diagonal
            } else if (filter !== 0) throw new Error('Unsupported PNG filter')
            row[index] = (row[index] + predictor) & 255
        }
        for (let x = 0; x < width; x++) {
            const dest = (y * width + x) * 4,
                source = x * channels
            pixels[dest] = row[source]
            pixels[dest + 1] = row[source + 1]
            pixels[dest + 2] = row[source + 2]
            pixels[dest + 3] = channels === 4 ? row[source + 3] : 255
        }
        previous = row
    }
    return {
        width,
        height,
        rgbaSha256: createHash('sha256').update(pixels).digest('hex'),
    }
}
