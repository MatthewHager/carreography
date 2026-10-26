"""Write and read FSEQ v2.0 uncompressed files, the format Tesla vehicles accept."""

import hashlib
import struct

import numpy as np


def _var_header(code: str, value: str) -> bytes:
    data = value.encode("utf-8") + b"\x00"
    return struct.pack("<H", len(data) + 4) + code.encode("ascii") + data


def write_fseq(path, frames: np.ndarray, step_ms: int, media_filename: str = ""):
    """frames: uint8 array shaped (frame_count, channel_count)."""
    frames = np.ascontiguousarray(frames, dtype=np.uint8)
    frame_count, channel_count = frames.shape

    var = b""
    if media_filename:
        var += _var_header("mf", media_filename)
    var += _var_header("sp", "tesla-lightshow generator")

    header_len = 32
    data_offset = header_len + len(var)
    data_offset += (-data_offset) % 4  # xLights pads the data offset to 4 bytes

    header = b"PSEQ"
    header += struct.pack("<HBBH", data_offset, 0, 2, header_len)  # minor 0, major 2
    header += struct.pack("<IIB", channel_count, frame_count, step_ms)
    header += bytes([0, 0, 0, 0, 0])  # flags, compression (none), blocks, sparse ranges, reserved
    # the 64-bit unique id: derived from the show itself (was random), so a rebuild that produces
    # the same show produces a byte-identical file
    header += hashlib.blake2b(frames.tobytes() + media_filename.encode(), digest_size=8).digest()
    assert len(header) == header_len

    with open(path, "wb") as f:
        f.write(header)
        f.write(var)
        f.write(b"\x00" * (data_offset - header_len - len(var)))
        f.write(frames.tobytes())


def read_fseq(path):
    """Returns (frames, step_ms) for an uncompressed FSEQ v2 file."""
    with open(path, "rb") as f:
        d = f.read()
    if d[:4] != b"PSEQ":
        raise ValueError("not an FSEQ file")
    data_offset = struct.unpack("<H", d[4:6])[0]
    channel_count, frame_count, step_ms = struct.unpack("<IIB", d[10:19])
    if d[20] & 0x0F:
        raise ValueError("compressed FSEQ not supported")
    raw = np.frombuffer(d, dtype=np.uint8, count=channel_count * frame_count, offset=data_offset)
    return raw.reshape(frame_count, channel_count), step_ms
