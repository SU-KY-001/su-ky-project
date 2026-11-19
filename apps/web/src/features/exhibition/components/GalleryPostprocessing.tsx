import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

export function GalleryPostprocessing(): null {
  const { gl, scene, camera, size, invalidate } = useThree();
  const composer = useRef<EffectComposer | null>(null);
  const film = useRef<ShaderPass | null>(null);
  useEffect(() => {
    const pipeline = new EffectComposer(gl);
    // Half-resolution, eight-sample AO keeps the effect modest on laptop GPUs.
    pipeline.setPixelRatio(Math.min(gl.getPixelRatio(), 1));
    pipeline.setSize(size.width, size.height);
    const render = new RenderPass(scene, camera);
    const ao = new SSAOPass(scene, camera, size.width, size.height, 8);
    ao.kernelRadius = 0.28;
    ao.minDistance = 0.001;
    ao.maxDistance = 0.035;
    const output = new OutputPass();
    const finish = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
        void main(){
          vec3 color=texture2D(tDiffuse,vUv).rgb;
          float grain=fract(sin(dot(gl_FragCoord.xy+floor(time*12.0),vec2(12.9898,78.233)))*43758.5453)-0.5;
          float vignette=1.0-0.13*smoothstep(0.25,0.76,length(vUv-0.5));
          gl_FragColor=vec4(color*vignette+grain*0.004,1.0);
        }`,
    });
    pipeline.addPass(render); pipeline.addPass(ao); pipeline.addPass(output); pipeline.addPass(finish);
    ao.setSize(Math.max(1, Math.round(size.width / 2)), Math.max(1, Math.round(size.height / 2)));
    composer.current = pipeline;
    film.current = finish;
    invalidate();
    return () => {
      composer.current = null;
      film.current = null;
      render.dispose(); ao.dispose(); output.dispose(); finish.dispose(); pipeline.dispose();
    };
  }, [gl, scene, camera, size.width, size.height, invalidate]);
  useFrame(({ clock }, dt) => {
    if (film.current) film.current.uniforms.time!.value = clock.elapsedTime;
    composer.current?.render(dt);
  }, 1);
  return null;
}
