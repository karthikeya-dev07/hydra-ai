"""
HYDRA AI — Model Training Pipeline
Fine-tune YOLOv11 on Indian traffic datasets
"""

import os
import yaml
import shutil
from pathlib import Path
from datetime import datetime

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


# ── Dataset Configuration ────────────────────────────────────
HYDRA_CLASSES = ["bike", "car", "auto", "bus", "truck", "pedestrian", "ambulance"]

DATASET_YAML_TEMPLATE = """
# HYDRA AI — Indian Traffic Dataset
# Classes: {num_classes}

path: {dataset_path}
train: images/train
val: images/val
test: images/test

nc: {num_classes}
names: {class_names}

# Augmentation for Indian traffic conditions
# (configured in train.py)
"""

TRAIN_YAML_TEMPLATE = """
# HYDRA AI Training Configuration
model: {base_model}
data: {dataset_yaml}
epochs: {epochs}
imgsz: {imgsz}
batch: {batch}
lr0: 0.01
lrf: 0.01
momentum: 0.937
weight_decay: 0.0005
warmup_epochs: 3
patience: 50
device: {device}
workers: {workers}
project: runs/hydra
name: {run_name}
exist_ok: true
pretrained: true
optimizer: AdamW
cos_lr: true
close_mosaic: 10
amp: true
# Indian traffic augmentations
degrees: 5.0
translate: 0.1
scale: 0.5
shear: 2.0
perspective: 0.0
flipud: 0.0
fliplr: 0.5
mosaic: 1.0
mixup: 0.1
copy_paste: 0.1
"""


def setup_dataset_structure(base_dir: str = "datasets/hydra_traffic"):
    """Create the YOLO dataset folder structure."""
    base = Path(base_dir)
    for split in ["train", "val", "test"]:
        (base / "images" / split).mkdir(parents=True, exist_ok=True)
        (base / "labels" / split).mkdir(parents=True, exist_ok=True)

    # Write dataset.yaml
    dataset_yaml = base / "dataset.yaml"
    content = DATASET_YAML_TEMPLATE.format(
        num_classes=len(HYDRA_CLASSES),
        dataset_path=str(base.resolve()),
        class_names=HYDRA_CLASSES,
    )
    dataset_yaml.write_text(content.strip())

    print(f"[HYDRA TRAIN] Dataset structure created at: {base.resolve()}")
    print(f"[HYDRA TRAIN] Classes ({len(HYDRA_CLASSES)}): {HYDRA_CLASSES}")
    print(f"\nNext steps:")
    print(f"  1. Add training images to: {base}/images/train/")
    print(f"  2. Add YOLO labels to:     {base}/labels/train/")
    print(f"  3. Run: python train.py --epochs 100")
    print(f"\nRecommended datasets:")
    print(f"  - IDD (Indian Driving Dataset): https://idd.insaan.iiit.ac.in/")
    print(f"  - Custom Hyderabad CCTV footage")
    print(f"  - Roboflow Indian traffic datasets")
    return str(dataset_yaml)


def train(
    base_model: str = "yolo11n.pt",
    dataset_yaml: str = "datasets/hydra_traffic/dataset.yaml",
    epochs: int = 100,
    imgsz: int = 640,
    batch: int = 16,
    device: str = "auto",
    workers: int = 4,
    run_name: str = None,
):
    """Train/fine-tune YOLO on Indian traffic dataset."""
    if not YOLO_AVAILABLE:
        print("[HYDRA TRAIN] ERROR: ultralytics not installed.")
        print("Install: pip install ultralytics")
        return

    if not Path(dataset_yaml).exists():
        print(f"[HYDRA TRAIN] Dataset YAML not found: {dataset_yaml}")
        print("Run: python train.py --setup")
        return

    if device == "auto":
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            device = "cpu"

    run_name = run_name or f"hydra_v1_{datetime.now().strftime('%Y%m%d_%H%M')}"
    print(f"\n{'='*60}")
    print(f"  HYDRA AI — Training Pipeline")
    print(f"{'='*60}")
    print(f"  Base model:  {base_model}")
    print(f"  Dataset:     {dataset_yaml}")
    print(f"  Epochs:      {epochs}")
    print(f"  Image size:  {imgsz}x{imgsz}")
    print(f"  Batch size:  {batch}")
    print(f"  Device:      {device}")
    print(f"  Run name:    {run_name}")
    print(f"{'='*60}\n")

    model = YOLO(base_model)
    results = model.train(
        data=dataset_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        device=device,
        workers=workers,
        project="runs/hydra",
        name=run_name,
        exist_ok=True,
        pretrained=True,
        optimizer="AdamW",
        cos_lr=True,
        close_mosaic=10,
        amp=True,
        degrees=5.0,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.1,
        copy_paste=0.1,
    )

    best_path = f"runs/hydra/{run_name}/weights/best.pt"
    if Path(best_path).exists():
        shutil.copy(best_path, "hydra_model_best.pt")
        print(f"\n[HYDRA TRAIN] ✅ Training complete!")
        print(f"[HYDRA TRAIN] Best model saved to: hydra_model_best.pt")
        print(f"[HYDRA TRAIN] Use in detector: HydraDetector(model_path='hydra_model_best.pt')")
    
    return results


def evaluate(model_path: str = "hydra_model_best.pt", dataset_yaml: str = "datasets/hydra_traffic/dataset.yaml"):
    """Evaluate model on test set."""
    if not YOLO_AVAILABLE:
        print("[HYDRA] ultralytics not installed")
        return

    model = YOLO(model_path)
    metrics = model.val(data=dataset_yaml, split="test")
    print(f"\n[HYDRA EVAL] Results:")
    print(f"  mAP50:    {metrics.box.map50:.3f}")
    print(f"  mAP50-95: {metrics.box.map:.3f}")
    print(f"  Precision:{metrics.box.mp:.3f}")
    print(f"  Recall:   {metrics.box.mr:.3f}")
    return metrics


def export_model(model_path: str = "hydra_model_best.pt", format: str = "onnx"):
    """Export model for production deployment."""
    if not YOLO_AVAILABLE:
        print("[HYDRA] ultralytics not installed")
        return
    model = YOLO(model_path)
    exported = model.export(format=format, optimize=True, simplify=True)
    print(f"[HYDRA EXPORT] Model exported: {exported}")
    return exported


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="HYDRA AI Training Pipeline")
    parser.add_argument("--setup", action="store_true", help="Create dataset structure")
    parser.add_argument("--train", action="store_true", help="Train model")
    parser.add_argument("--eval", action="store_true", help="Evaluate model")
    parser.add_argument("--export", action="store_true", help="Export model")
    parser.add_argument("--model", default="yolo11n.pt", help="Base model")
    parser.add_argument("--data", default="datasets/hydra_traffic/dataset.yaml")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--format", default="onnx", help="Export format")
    args = parser.parse_args()

    if args.setup:
        setup_dataset_structure()
    if args.train:
        train(args.model, args.data, args.epochs, args.imgsz, args.batch, args.device)
    if args.eval:
        evaluate(args.model, args.data)
    if args.export:
        export_model(args.model, args.format)
    if not any([args.setup, args.train, args.eval, args.export]):
        print("HYDRA AI Training Pipeline")
        print("Usage: python train.py --setup | --train | --eval | --export")
        print("Example: python train.py --setup && python train.py --train --epochs 100")
