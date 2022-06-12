import {
  AnimatePresence,
  MotionValue,
  useMotionValue,
  usePresence,
  useTime,
  useTransform,
} from "framer-motion";
import { clamp } from "popmotion";
import {
  Children,
  ComponentType,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { matchRoutes, RouteObject } from "react-router";
import { PageManagerState, usePageManager } from "./manager";
import { HTMLMotionProps, motion, useSpring } from "framer-motion";
import {
  keyframes as animation,
  SpringOptions,
  Animation as PopmotionAnimation,
} from "popmotion";
import throttle from "lodash.throttle";
import { useRouter } from "next/router";

export const Definition = ({ path, children }: any) => {
  return children;
};

const PageManagerContext = createContext<any>(null);

interface ContainerProps {
  component: ComponentType<any> | null;
  children: any;
}

const getRouteKey = (route: any) => {
  return route.path;
};

interface UseDurationOptions {
  onComplete?: () => void;
  onChange?: (val: any) => void;
}

const useDuration = (
  duration: number,
  { onComplete, onChange }: UseDurationOptions = {}
) => {
  const clock = useTime();
  const progress = useTransform(clock, (time) => clamp(0, 1, time / duration));

  useEffect(() => {
    return progress.onChange((val) => {
      onChange?.(val);
      if (val >= 1) {
        clock.stop();
        onComplete?.();
      }
    });
  }, []);

  return progress;
};

const UnmountController = ({ duration, onComplete, onChange }: any) => {
  useDuration(duration, {
    onChange,
    onComplete: () => {
      console.log("exited");
      onComplete?.();
    },
  });

  return null;
};

interface PageApi {
  enterProgress: MotionValue<number>;
  exitProgress: MotionValue<number | undefined>;
}

const PageContext = createContext<PageApi | null>(null);

export const usePage = () => {
  const page = useContext(PageContext);
  if (!page) {
    throw new Error("usePage can only be used within a Page");
  }
  return page;
};

const Page = ({
  route,
  children,
  enterDuration = 700,
  exitDuration = 700,
}: any) => {
  const manager = useContext(PageManagerContext);
  const [isPresent, markSafeToRemove] = usePresence();
  const enterProgress = useDuration(enterDuration, {
    onComplete: () => {
      console.log("entered");
      manager?.dispatch({
        type: "ENTER_COMPLETE",
      });
    },
  });
  const exitProgress = useMotionValue<number | undefined>(undefined);

  return (
    <PageContext.Provider value={{ enterProgress, exitProgress }}>
      {!isPresent && (
        <UnmountController
          duration={exitDuration}
          onChange={(val: number) => {
            exitProgress.set(val);
          }}
          onComplete={() => {
            console.log("exited");
            manager?.dispatch({
              type: "EXIT_COMPLETE",
            });
            markSafeToRemove?.();
          }}
        />
      )}
      {children}
    </PageContext.Provider>
  );
};

export const Container = ({ component, children }: ContainerProps) => {
  const router = useRouter();
  const childrenByRouteKey: any = {};
  Children.forEach(children, (child) => {
    if (child?.props.path) {
      childrenByRouteKey[getRouteKey(child.props)] = child;
    }
  });
  const routes: RouteObject[] = [];
  Children.forEach(children, (child) => {
    if (child?.props.path) {
      routes.push({
        path: child.props.path,
        caseSensitive: child.props.caseSensitive,
        element: child.props.children,
      });
    }
  });
  const match = matchRoutes(routes, router.asPath)?.[0];

  const manager = usePageManager();

  useEffect(() => {
    const handlers = {
      start: (path: string) => {
        manager.dispatch({
          type: "ROUTE_CHANGE",
          route: match?.route.path,
          component: null,
        });
      },
    };
    router.events.on("routeChangeStart", handlers.start);

    return () => {
      router.events.off("routeChangeStart", handlers.start);
    };
  }, []);

  useEffect(() => {
    if (match?.route.path) {
      manager.dispatch({
        type: "ROUTE_CHANGE",
        route: match?.route.path,
        component,
      });
    }
  }, [match?.route.path, component]);

  // console.log(JSON.stringify(manager.state.context, null, 2));

  return (
    <PageManagerContext.Provider value={manager}>
      <AnimatePresence>
        {manager.state.matches("stationary") && manager.state.context.current && (
          <Page
            key={manager.state.context.current?.route}
            route={manager.state.context.current?.route}
          >
            {(() => {
              const Comp = manager.state.context.current?.component;
              return Comp && <Comp />;
            })()}
          </Page>
        )}
        {manager.state.matches("transitioning.entering") && (
          <Page
            key={manager.state.context.next?.route}
            route={manager.state.context.next?.route}
          >
            {(() => {
              const Comp = manager.state.context.next?.component;
              return Comp && <Comp />;
            })()}
          </Page>
        )}
      </AnimatePresence>
    </PageManagerContext.Provider>
  );
};

// ITEM.TSX
export type StyleObj = {
  scale?: number | string;
  scaleX?: number | string;
  scaleY?: number | string;
  scaleZ?: number | string;
  translateX?: number | string;
  translateY?: number | string;
  translateZ?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
  skewX?: number | string;
  skewY?: number | string;
  opacity?: number | string;
};

export type KeyframesContext = {
  data?: any;
};

export type KeyframesObj = Record<number, StyleObj>;
export type KeyframesFn = (context: KeyframesContext) => KeyframesObj;
export type Keyframes = KeyframesFn | KeyframesObj;
export type KeyframesMap = Map<number, StyleObj>;

interface Animation {
  get(progress: number): any;
}

const getAnimationForProperty = (
  property: string,
  keyframesMap: KeyframesMap
): Animation | null => {
  const values: any[] = [];
  const offsets: number[] = [];
  for (const [offset, keyframe] of keyframesMap.entries()) {
    if (property in keyframe) {
      values.push(keyframe[property]);
      offsets.push(offset);
    }
  }
  if (!values.length) {
    return null;
  }
  let anim: PopmotionAnimation<string | number>;
  if (values.length === 1) {
    // needs at least two values to work as expected
    anim = animation({
      to: [values[0], values[0]],
      offset: [offsets[0], offsets[0] + 1],
      duration: 1,
    });
  } else {
    anim = animation({
      to: values,
      offset: offsets,
      duration: 1,
    });
  }
  return {
    get(progress: number) {
      return anim.next(progress).value;
    },
  };
};

const getKeyframesContext = (data: any): KeyframesContext => {
  return {
    data,
  };
};

const processKeyframes = (keyframes: Keyframes, data: any) => {
  let keyframesObj: KeyframesObj;
  if (typeof keyframes === "function") {
    keyframesObj = keyframes(getKeyframesContext(data));
  } else {
    keyframesObj = keyframes;
  }
  const offsets = Object.keys(keyframesObj).sort(
    (a, b) => Number(a) - Number(b)
  );
  const map = new Map<number, StyleObj>();
  offsets.forEach((offset) => {
    map.set(Number(offset), keyframesObj[offset]);
  });
  return map;
};

export type SpringConfigs = {
  scale?: SpringOptions;
  scaleX?: SpringOptions;
  scaleY?: SpringOptions;
  scaleZ?: SpringOptions;
  translateX?: SpringOptions;
  translateY?: SpringOptions;
  translateZ?: SpringOptions;
  rotateX?: SpringOptions;
  rotateY?: SpringOptions;
  rotateZ?: SpringOptions;
  skewX?: SpringOptions;
  skewY?: SpringOptions;
  opacity?: SpringOptions;
};

const DEFAULT_SPRING_CONFIGS: SpringConfigs = {
  translateX: {
    mass: 0.05,
    damping: 7.5,
    stiffness: 100,
  },
  translateY: {
    mass: 0.05,
    damping: 7.5,
    stiffness: 100,
  },
  translateZ: {
    mass: 0.05,
    damping: 7.5,
    stiffness: 100,
  },
  scale: {
    restDelta: 0.000000001,
    restSpeed: 0.000000001,
    mass: 0.05,
    damping: 20,
  },
  scaleX: {
    restDelta: 0.000000001,
    restSpeed: 0.000000001,
    mass: 0.05,
    damping: 20,
  },
  scaleY: {
    restDelta: 0.000000001,
    restSpeed: 0.000000001,
    mass: 0.05,
    damping: 20,
  },
  scaleZ: {
    restDelta: 0.000000001,
    restSpeed: 0.000000001,
    mass: 0.05,
    damping: 20,
  },
  skewX: {
    mass: 0.1,
    damping: 20,
  },
  skewY: {
    mass: 0.1,
    damping: 20,
  },
  rotateX: {
    mass: 0.05,
    damping: 7.5,
    stiffness: 100,
  },
  rotateY: {
    mass: 0.05,
    damping: 7.5,
    stiffness: 100,
  },
  rotateZ: {
    mass: 0.05,
    damping: 7.5,
    stiffness: 100,
  },
  opacity: {
    mass: 0.1,
    damping: 20,
  },
};

export const Item = ({
  keyframes = {},
  springConfigs,
  data,
  ...otherProps
}: any) => {
  if (!keyframes.enter) {
    keyframes.enter = {};
  }
  if (!keyframes.exit) {
    keyframes.exit = {};
  }

  const { enterProgress, exitProgress } = usePage();
  const enterAnimations = useMemo(() => {
    const keyframesMap = processKeyframes(keyframes.enter, data);
    return {
      translateX: getAnimationForProperty("translateX", keyframesMap),
      translateY: getAnimationForProperty("translateY", keyframesMap),
      translateZ: getAnimationForProperty("translateZ", keyframesMap),
      scale: getAnimationForProperty("scale", keyframesMap),
      scaleX: getAnimationForProperty("scaleX", keyframesMap),
      scaleY: getAnimationForProperty("scaleY", keyframesMap),
      scaleZ: getAnimationForProperty("scaleZ", keyframesMap),
      skewX: getAnimationForProperty("skewX", keyframesMap),
      skewY: getAnimationForProperty("skewY", keyframesMap),
      rotateX: getAnimationForProperty("rotateX", keyframesMap),
      rotateY: getAnimationForProperty("rotateY", keyframesMap),
      rotateZ: getAnimationForProperty("rotateZ", keyframesMap),
      opacity: getAnimationForProperty("opacity", keyframesMap),
    };
  }, [keyframes.enter, JSON.stringify(data)]);

  const exitAnimations = useMemo(() => {
    const keyframesMap = processKeyframes(keyframes.exit, data);
    return {
      translateX: getAnimationForProperty("translateX", keyframesMap),
      translateY: getAnimationForProperty("translateY", keyframesMap),
      translateZ: getAnimationForProperty("translateZ", keyframesMap),
      scale: getAnimationForProperty("scale", keyframesMap),
      scaleX: getAnimationForProperty("scaleX", keyframesMap),
      scaleY: getAnimationForProperty("scaleY", keyframesMap),
      scaleZ: getAnimationForProperty("scaleZ", keyframesMap),
      skewX: getAnimationForProperty("skewX", keyframesMap),
      skewY: getAnimationForProperty("skewY", keyframesMap),
      rotateX: getAnimationForProperty("rotateX", keyframesMap),
      rotateY: getAnimationForProperty("rotateY", keyframesMap),
      rotateZ: getAnimationForProperty("rotateZ", keyframesMap),
      opacity: getAnimationForProperty("opacity", keyframesMap),
    };
  }, [keyframes.exit, JSON.stringify(data)]);

  const mergedSpringConfigs = {
    ...DEFAULT_SPRING_CONFIGS,
    ...springConfigs,
  };

  const springs = {
    translateX: useSpring(
      enterAnimations.translateX?.get(0) ?? "0",
      mergedSpringConfigs.translateX
    ),
    translateY: useSpring(
      enterAnimations.translateY?.get(0) ?? "0",
      mergedSpringConfigs.translateY
    ),
    translateZ: useSpring(
      enterAnimations.translateZ?.get(0) ?? "0",
      mergedSpringConfigs.translateZ
    ),
    scale: useSpring(
      enterAnimations.scale?.get(0) ?? "1",
      mergedSpringConfigs.scale
    ),
    scaleX: useSpring(
      enterAnimations.scaleX?.get(0) ?? "1",
      mergedSpringConfigs.scaleX
    ),
    scaleY: useSpring(
      enterAnimations.scaleY?.get(0) ?? "1",
      mergedSpringConfigs.scaleY
    ),
    scaleZ: useSpring(
      enterAnimations.scaleZ?.get(0) ?? "1",
      mergedSpringConfigs.scaleZ
    ),
    skewX: useSpring(
      enterAnimations.skewX?.get(0) ?? "0",
      mergedSpringConfigs.skewX
    ),
    skewY: useSpring(
      enterAnimations.skewY?.get(0) ?? "0",
      mergedSpringConfigs.skewY
    ),
    rotateX: useSpring(
      enterAnimations.rotateX?.get(0) ?? "0",
      mergedSpringConfigs.rotateX
    ),
    rotateY: useSpring(
      enterAnimations.rotateY?.get(0) ?? "0",
      mergedSpringConfigs.rotateY
    ),
    rotateZ: useSpring(
      enterAnimations.rotateZ?.get(0) ?? "0",
      mergedSpringConfigs.rotateZ
    ),
    opacity: useSpring(
      enterAnimations.opacity?.get(0) ?? "1",
      mergedSpringConfigs.opacity
    ),
  };

  useEffect(() => {
    const updateSprings = throttle(
      (progress: number, animations: any) => {
        springs.translateX.set(animations.translateX?.get(progress) ?? "0");
        springs.translateY.set(animations.translateY?.get(progress) ?? "0");
        springs.translateZ.set(animations.translateZ?.get(progress) ?? "0");
        springs.scale.set(animations.scale?.get(progress) ?? "1");
        springs.scaleX.set(animations.scaleX?.get(progress) ?? "1");
        springs.scaleY.set(animations.scaleY?.get(progress) ?? "1");
        springs.scaleZ.set(animations.scaleZ?.get(progress) ?? "1");
        springs.skewX.set(animations.skewX?.get(progress) ?? "0");
        springs.skewY.set(animations.skewY?.get(progress) ?? "0");
        springs.rotateX.set(animations.rotateX?.get(progress) ?? "0");
        springs.rotateY.set(animations.rotateY?.get(progress) ?? "0");
        springs.rotateZ.set(animations.rotateZ?.get(progress) ?? "0");
        springs.opacity.set(animations.opacity?.get(progress) ?? "1");
      },
      90,
      { leading: true, trailing: true }
    );

    const unsub1 = enterProgress.onChange((val) => {
      updateSprings(val, enterAnimations);
    });
    const unsub2 = exitProgress.onChange((val) => {
      if (val !== undefined) {
        updateSprings(val, exitAnimations);
      }
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [enterAnimations, exitAnimations, enterProgress, exitProgress]);

  return (
    <motion.div
      {...otherProps}
      style={{
        ...otherProps.style,
        translateX: springs.translateX,
        translateY: springs.translateY,
        translateZ: springs.translateZ,
        scale: springs.scale,
        scaleX: springs.scaleX,
        scaleY: springs.scaleY,
        scaleZ: springs.scaleZ,
        skewX: springs.skewX,
        skewY: springs.skewY,
        rotateX: springs.rotateX,
        rotateY: springs.rotateY,
        rotateZ: springs.rotateZ,
        opacity: springs.opacity,
      }}
    />
  );
};
