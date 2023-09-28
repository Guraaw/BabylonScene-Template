var createScene = async function () {
    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);
    BABYLON.SceneLoader.ShowLoadingScreen = false;

    // create camera and lights for scene
    const lights = {};
    const env = {};
    const camera = {};
    async function initScene() {
        scene.clearColor = new BABYLON.Color3.FromInts(238, 157, 57);
        camera.main = new BABYLON.ArcRotateCamera("camera", BABYLON.Tools.ToRadians(70), BABYLON.Tools.ToRadians(60), 0.09, new BABYLON.Vector3(0.0, 0.0, 0.0), scene);
        camera.main.minZ = 0.0001;
        camera.main.wheelDeltaPercentage = 0.2;
        camera.main.upperRadiusLimit = 0.2;
        camera.main.lowerRadiusLimit = 0.05;
        camera.main.upperBetaLimit = 1.4;
        camera.main.lowerBetaLimit = 0;
        camera.main.panningAxis = new BABYLON.Vector3(0, 0, 0);
        camera.main.attachControl(canvas, true);

        env.lighting = BABYLON.CubeTexture.CreateFromPrefilteredData("https://patrickryanms.github.io/BabylonJStextures/Demos/d20_pbr/env/runyonCanyon.env", scene);
        env.lighting.name = "runyonCanyon";
        env.lighting.gammaSpace = false;
        env.lighting.rotationY = 1.9;
        scene.environmentTexture = env.lighting;
        scene.environmentIntensity = 2.0;

        lights.dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0.51, -1.2, -0.83), scene);
        lights.dirLight.position = new BABYLON.Vector3(-0.04, 0.057, 0.01);
        lights.dirLight.shadowMinZ = 0.01;
        lights.dirLight.shadowMaxZ = 0.15;
        lights.dirLight.intensity = 3; 
    }   

    const dice = {};
    async function loadMeshes() {
        dice.file = await BABYLON.SceneLoader.AppendAsync("https://patrickryanms.github.io/BabylonJStextures/Demos/d20_pbr/gltf/d20_scene.gltf");
        dice.d20_center = scene.getMeshByName("d20_basePBR_middle_low");
        dice.ground = scene.getMeshByName("groundPlane_low");
        scene.getMeshByName("d20_basePBR_left_low").dispose(true, true);
        scene.getMeshByName("d20_basePBR_right_low").dispose(true, true);
        lights.dirLight.includedOnlyMeshes.push(dice.ground);
        dice.ground.position.y = -0.00001;	
        readyCheck.meshesReady = true;
    }

    let loadTexturesAsync = async function() {
        let textures = [];
        return new Promise((resolve, reject) => {
            let textureUrls = [
                "https://raw.githubusercontent.com/Guraaw/BabylonScene-Template/main/Textures/dice_d.png",
                "https://raw.githubusercontent.com/Guraaw/BabylonScene-Template/main/Textures/dice_m.png",
                "https://raw.githubusercontent.com/Guraaw/BabylonScene-Template/main/Textures/dice_r.png",
                "https://raw.githubusercontent.com/Guraaw/BabylonScene-Template/main/Textures/dice_n.png",
                "https://raw.githubusercontent.com/Guraaw/BabylonScene-Template/main/Textures/dice_s.png"
            ];

            for (let url of textureUrls) {
                textures.push(new BABYLON.Texture(url, scene, false, false));
            }

            whenAllReady(textures, () => resolve(textures));
        }).then(() => {
            readyCheck.texturesReady = true;
        });
    };

    // test if a texture is loaded
    let whenAllReady = function(textures, resolve) {
        let numRemaining = textures.length;
        if (numRemaining == 0) {
            resolve();
            return;
        }

        for (let i = 0; i < textures.length; i++) {
            let texture = textures[i];
            if (texture.isReady()) {
                if (--numRemaining === 0) {
                    resolve();
                    return;
                }
            } 
            else {
                let onLoadObservable = texture.onLoadObservable;
                if (onLoadObservable) {
                    onLoadObservable.addOnce(() => {
                        if (--numRemaining === 0) {
                            resolve();
                        }
                    });
                }
            }
        }
    };

    let retrieveTexture = function (meshMat, channel, textures) {
        let texture;
        for (let file of textures) {
            let segment = file.name.split("/");
            if (segment[segment.length -1].split("_")[1] === meshMat) {
                if (segment[segment.length -1].split("_")[2] === channel + ".png") {
                    texture = file;
                    return texture;
                }
            }
        }
    };

    let retrieveLocalTexture = function (meshMat, textures) {
        let texture;
        for (let file of textures) {
            let segment = file.name.split("/");
            if (segment[segment.length -1] === meshMat) {
                texture = file;
                return texture;
            }
        }
    };


    BABYLON.NodeMaterial.IgnoreTexturesAtLoadTime = true;
    const diceMats = {};
    const diceParameters = {};
    async function createMaterials() {


        diceMats.d20_center = new BABYLON.NodeMaterial("d20CenterNodeMat", scene, { emitComments: false });
        await diceMats.d20_center.loadAsync("https://raw.githubusercontent.com/Guraaw/BabylonScene-Template/main/Materials/myPBRmat.json");
        diceMats.d20_center.build(false);



        diceMats.ground = new BABYLON.NodeMaterial("groundNodeMat", scene, { emitComments: false });
        await diceMats.ground.loadAsync("https://raw.githubusercontent.com/Guraaw/BabylonScene-Template/main/Materials/groundMat.json");
        diceMats.ground.build(false);
        
        dice.d20_center.material = diceMats.d20_center;

        dice.ground.material.dispose();
        dice.ground.material = diceMats.ground;


        diceParameters.centerNormal = diceMats.d20_center.getBlockByName("NormalTex");
        diceParameters.centerMask = diceMats.d20_center.getBlockByName("numberMaskTex");
        diceParameters.centerDiffuse = diceMats.d20_center.getBlockByName("DiffuseTex");
        diceParameters.centerMetallic = diceMats.d20_center.getBlockByName("MetallicTex");
        diceParameters.centerRoughness = diceMats.d20_center.getBlockByName("RoughnessTex");
        diceParameters.centerReflection = diceMats.d20_center.getBlockByName("Reflection");



        diceParameters.groundColor = diceMats.ground.getBlockByName("groundColor");
        diceParameters.groundColor.value = scene.clearColor;

        diceParameters.centerDiffuse.texture = retrieveLocalTexture("dice_d.png", scene.textures);
        diceParameters.centerMask.texture = retrieveLocalTexture("dice_s.png", scene.textures);
        diceParameters.centerMetallic.texture = retrieveLocalTexture("dice_m.png", scene.textures);
        diceParameters.centerNormal.texture = retrieveLocalTexture("dice_n.png", scene.textures);
        diceParameters.centerRoughness.texture = retrieveLocalTexture("dice_r.png", scene.textures);


        // dice.d20_right.onBeforeRenderObservable.add(() => {
        //     diceParameters.rightFrontFace.value = 0.0;
        // });

        // dice.d20_right.onBetweenPassObservable.add(() => {
        //     diceParameters.rightFrontFace.value = 1.0;
        //     let subMesh = dice.d20_right.subMeshes[0];            
        //     scene.resetCachedMaterial();
        //     diceMats.d20_right.bindForSubMesh(dice.d20_right.getWorldMatrix(), dice.d20_right, subMesh);
        // });

        readyCheck.materialsReady = true;
    }

    const shadows = {};
    function generateShadows() {
        shadows.shadowGenerator = new BABYLON.ShadowGenerator(512, lights.dirLight);
        shadows.shadowGenerator.useContactHardeningShadow = true;
        shadows.shadowGenerator.contactHardeningLightSizeUVRatio = 0.485;
        shadows.shadowGenerator.darkness = 0.43;
        shadows.shadowGenerator.addShadowCaster(dice.d20_center);
        shadows.shadowGenerator.enableSoftTransparentShadow = true;
        shadows.shadowGenerator.transparencyShadow = true;
        dice.ground.receiveShadows = true;
        dice.ground.material.environmentIntensity = 2;
    }

    const glowPass = {};
    function glowLayer() {
        if (diceMats.d20_center.getBlockByName("glowMask") !== null) {
            glowPass.glowMask = diceMats.d20_center.getBlockByName("glowMask");
            glowPass.glow = new BABYLON.GlowLayer("glow", scene);
            glowPass.glow.intensity = 0.35;
    
            // set up material to use glow layer
            glowPass.glow.referenceMeshToUseItsOwnMaterial(dice.d20_center);
    
            // enable glow mask to render only emissive into glow layer, and then disable glow mask
            glowPass.glow.onBeforeRenderMeshToEffect.add(() => {
                glowPass.glowMask.value = 1.0;
            });
            glowPass.glow.onAfterRenderMeshToEffect.add(() => {
                glowPass.glowMask.value = 0.0;
            });    
        }
    }

    const readyCheck = {
        meshesReady: false,
        texturesReady: false,
        materialsReady: false
    };
    function checkTrue(ready) {
        for (let value in ready) {
            if (value === false) {
                return false;
            }
        }
        return true;
    }
    function readyScene() {
        if (checkTrue(readyCheck)) {
            engine.hideLoadingUI();
        }
        else {
            console.log("looping");
            setTimeout(() => {
                readyScene();
            }, 1000);
        }
    }

    engine.displayLoadingUI();
    initScene();
    await loadMeshes();
    await loadTexturesAsync();
    await createMaterials();
    generateShadows();
    glowLayer();  
    readyScene();
    scene.debugLayer.show({embedMode: true});

    return scene;
};