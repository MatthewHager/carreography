"""The two models the browser app runs, as ONNX files for its site build.

    .venv_beats/bin/python tools/export_models.py OUT_DIR

(.venv_beats has beat-this and PyTorch; add the ONNX tools once with
`uv pip install --python .venv_beats/bin/python onnx onnxruntime`.)

- beat-this (CPJKU, MIT): the "final0" checkpoint, exported without its log-mel front end (the app
  computes that itself, app/src/engine/listen/beats.ts), with fp16 weights cast back to fp32 at load,
  which halves the download and keeps the arithmetic fp32. Checked against PyTorch before it's written.
- basic-pitch (Spotify, Apache-2.0): its own nmp.onnx, copied from the basic_pitch package in .venv312.

The site build downloads both from the repository's "models" release (.github/workflows/pages.yml),
so the files never enter the git history. To publish new ones:

    gh release upload models OUT_DIR/*.onnx --clobber
"""

import shutil
import sys
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import torch
from beat_this.inference import load_model
from onnx import TensorProto, helper, numpy_helper

ROOT = Path(__file__).resolve().parents[1]


class Logits(torch.nn.Module):
    """(batch, frames, 128 mel bands) -> beat and downbeat logits (batch, frames)."""

    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, spect):
        out = self.model(spect)
        return out["beat"], out["downbeat"]


def fp16_weights(path):
    """Every large float initializer stored as fp16 plus a Cast back to fp32 (folded by ORT at load)."""
    m = onnx.load(str(path))
    g = m.graph
    inits, casts = [], []
    for init in g.initializer:
        if init.data_type == TensorProto.FLOAT and np.prod(init.dims) >= 64:
            h = numpy_helper.from_array(numpy_helper.to_array(init).astype(np.float16), init.name + "_fp16")
            inits.append(h)
            casts.append(helper.make_node("Cast", [h.name], [init.name], to=TensorProto.FLOAT, name=init.name + "_cast"))
        else:
            inits.append(init)
    del g.initializer[:]
    g.initializer.extend(inits)
    nodes = list(g.node)
    del g.node[:]
    g.node.extend(casts + nodes)
    onnx.save(m, str(path))


def beat_this(out):
    model = Logits(load_model("final0", "cpu")).eval()
    x = torch.rand(1, 1500, 128) * 4
    path = out / "beat_this-final0-fp16w.onnx"
    with torch.inference_mode():
        torch.onnx.export(model, (x,), str(path), dynamo=False, opset_version=17, input_names=["spect"],
                          output_names=["beat", "downbeat"],
                          dynamic_axes={"spect": {0: "B", 1: "T"}, "beat": {0: "B", 1: "T"}, "downbeat": {0: "B", 1: "T"}})
    fp16_weights(path)
    onnx.checker.check_model(str(path))
    sess = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    with torch.inference_mode():
        ref, _ = model(x)
    got, _ = sess.run(None, {"spect": x.numpy()})
    err = float(np.abs(got - ref.numpy()).max())
    # fp16 weights move the logits a little; the beat positions don't change (spikes, Oct 2026)
    assert err < 0.5, f"beat-this export differs from PyTorch by {err}"
    print(f"{path.name}: {path.stat().st_size / 1e6:.0f} MB, max logit difference {err:.3f}")


def basic_pitch(out):
    venv = ROOT / ".venv312" / "lib"
    src = next(venv.glob("python3*/site-packages/basic_pitch/saved_models/icassp_2022/nmp.onnx"))
    shutil.copyfile(src, out / "basic_pitch-nmp.onnx")
    print(f"basic_pitch-nmp.onnx: {src.stat().st_size / 1e3:.0f} kB")


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    beat_this(out)
    basic_pitch(out)


if __name__ == "__main__":
    main()
