import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SignUpForm from "../SignupForm";
import "@testing-library/jest-dom";

describe("SignUpForm", () => {
    it("shows an error if passwords do not match", async () => {
        const user = userEvent.setup();
        const onRegistered = vi.fn();
        const onGoToLogin = vi.fn();

        render(
            <SignUpForm
                onRegistered={onRegistered}
                onGoToLogin={onGoToLogin}
            />
        );

        await user.type(screen.getByLabelText(/username/i), "Pablo");
        await user.type(screen.getByLabelText(/email/i), "pablo@test.com");
        await user.type(screen.getByLabelText(/^password$/i), "abc123");
        await user.type(screen.getByLabelText(/confirm password/i), "xyz999");

        await user.click(screen.getByRole("button", { name: /sign up/i }));

        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
        expect(onRegistered).not.toHaveBeenCalled();
    });

    it("calls onGoToLogin when login link/button is clicked", async () => {
        const user = userEvent.setup();
        const onRegistered = vi.fn();
        const onGoToLogin = vi.fn();

        render(
            <SignUpForm
                onRegistered={onRegistered}
                onGoToLogin={onGoToLogin}
            />
        );

        await user.click(screen.getByRole("button", { name: /log in here/i }));

        expect(onGoToLogin).toHaveBeenCalledTimes(1);
    });
});