try:
    import anomalib
    print('anomalib バージョン:', anomalib.__version__)
    print('anomalib は正常にインポートできました。基本的な機能は使用可能です。')
    
    # 主要な依存パッケージも確認
    import numpy
    import scipy
    import matplotlib
    print('主要な依存パッケージ (numpy, scipy, matplotlib) は使用可能です。')
    
    # 追加の依存パッケージを確認
    import omegaconf
    import einops
    try:
        import kornia
        print('画像処理に必要な依存パッケージ (omegaconf, einops, kornia) は使用可能です。')
    except ImportError:
        print('kornia がインストールされていないため、一部の画像処理機能が制限されます。')
    
    # OpenCV（headlessバージョン）も確認
    import cv2
    print('OpenCV バージョン:', cv2.__version__)
    print('OpenCV-Python-Headless は使用可能です。')
    
    # pytorch-lightning、timm、imgaugも確認
    try:
        import pytorch_lightning
        import timm
        import imgaug
        print('追加の依存パッケージ (pytorch-lightning, timm, imgaug) は使用可能です。')
    except ImportError as e:
        print(f'一部の追加パッケージがインストールされていません: {e}')
    
except ImportError as e:
    print(f'エラー: {e}')
    print('anomalib またはその依存パッケージが正しくインストールされていません。')