package com.omix.aide

import androidx.lifecycle.Lifecycle
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test

/** Regression for v1.0.12: no Context access during the Activity constructor. */
class MainActivityStartupTest {
    @Test fun coldStartRecreationAndResumeKeepTheActivityAlive() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            InstrumentationRegistry.getInstrumentation().waitForIdleSync()
            scenario.onActivity { activity ->
                assertNotNull(activity.applicationContext)
                assertFalse(activity.isFinishing)
                assertFalse(activity.isDestroyed)
            }
            scenario.recreate()
            InstrumentationRegistry.getInstrumentation().waitForIdleSync()
            scenario.moveToState(Lifecycle.State.CREATED)
            scenario.moveToState(Lifecycle.State.RESUMED)
            scenario.onActivity { activity ->
                assertNotNull(activity.applicationContext)
                assertFalse(activity.isFinishing)
                assertFalse(activity.isDestroyed)
            }
            assertEquals(Lifecycle.State.RESUMED, scenario.state)
        }
    }
}
