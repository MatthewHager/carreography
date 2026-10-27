import numpy as np

from lightshow import channels as C
from lightshow.fseq import read_fseq, write_fseq
from make_usb import check_fseq


def test_round_trip_and_tesla_header(tmp_path):
    frames = np.random.default_rng(1).integers(0, 256, (500, C.N_CHANNELS), dtype=np.uint8)
    path = tmp_path / "show.fseq"
    write_fseq(path, frames, C.STEP_MS, media_filename="show.wav")
    back, step = read_fseq(path)
    assert step == C.STEP_MS
    assert np.array_equal(back, frames)
    assert check_fseq(path) == []


def test_same_show_same_bytes(tmp_path):
    frames = np.zeros((100, C.N_CHANNELS), np.uint8)
    frames[10:20, C.L_OUTER_MAIN] = C.ON
    a, b = tmp_path / "a.fseq", tmp_path / "b.fseq"
    write_fseq(a, frames, C.STEP_MS, "x.wav")
    write_fseq(b, frames, C.STEP_MS, "x.wav")
    assert a.read_bytes() == b.read_bytes()
