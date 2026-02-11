use anchor_lang::prelude::*;

declare_id!("4JBktZY34eDGdkfDb4ScuFCSS69t6NqM2E3n54S2WG1o");

#[program]
pub mod icb_protocol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
